// Trình soạn thảo CRUD chung, dựng UI (bảng + form) từ một schema mô tả
// registry. Thêm registry/field mới chỉ cần sửa file schema, không cần
// sửa file này — đúng yêu cầu "không giới hạn cứng" của Owner Console.
import { h } from '../../core/ui.js';
import { subscribeCollection, upsertRegistryDoc, deleteRegistryDoc } from '../../core/db.js';
import { openModal, confirmDangerous } from '../../core/dialog.js';
import { showToast } from '../../core/toast.js';

function fieldInput(field, value) {
  const v = value ?? field.default ?? '';
  switch (field.type) {
    case 'textarea':
      return h('textarea', { class: 'textarea', dataset: { key: field.key } }, String(v ?? ''));
    case 'number':
      return h('input', { class: 'input', type: 'number', dataset: { key: field.key }, value: v, min: field.min ?? '' });
    case 'boolean':
      return h('input', { type: 'checkbox', dataset: { key: field.key }, checked: !!v });
    case 'select':
      return h('select', { class: 'select', dataset: { key: field.key } }, (field.options || []).map((opt) => h('option', { value: opt, selected: opt === v }, opt)));
    case 'json':
      return h('textarea', { class: 'textarea', dataset: { key: field.key } }, v ? JSON.stringify(v, null, 2) : '');
    case 'image':
    case 'text':
    default:
      return h('input', { class: 'input', type: 'text', dataset: { key: field.key }, value: v, disabled: !!(field.immutable && value != null) });
  }
}

function readForm(form, schema) {
  const data = {};
  for (const field of schema.fields) {
    const el = form.querySelector(`[data-key="${field.key}"]`);
    if (!el) continue;
    if (field.type === 'boolean') data[field.key] = el.checked;
    else if (field.type === 'number') data[field.key] = el.value === '' ? null : Number(el.value);
    else if (field.type === 'json') {
      try { data[field.key] = el.value.trim() ? JSON.parse(el.value) : null; } catch { throw new Error(`Trường "${field.label}" không phải JSON hợp lệ.`); }
    } else data[field.key] = el.value;
  }
  return data;
}

export function mountRegistryEditor(container, scope, schema) {
  const root = h('div', {});
  const toolbar = h('div', { class: 'section-title' }, [
    h('h2', {}, `${schema.icon || ''} ${schema.label}`),
    h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      h('input', { class: 'input', id: 'search', placeholder: 'Tìm kiếm…', style: 'width:180px' }),
      h('button', { class: 'btn btn--ghost btn--small', onClick: () => exportJson() }, '⬇️ Xuất JSON'),
      h('button', { class: 'btn btn--ghost btn--small', onClick: () => importJsonPrompt() }, '⬆️ Nhập JSON'),
      h('button', { class: 'btn btn--primary btn--small', onClick: () => openEditor(null) }, '+ Thêm mới'),
    ]),
  ]);
  const tableWrap = h('div', { class: 'table-wrap' });
  root.append(toolbar, tableWrap);
  container.append(root);

  let allDocs = [];
  let searchTerm = '';
  const pendingDeletes = new Map();

  toolbar.querySelector('#search').addEventListener('input', (e) => { searchTerm = e.target.value.toLowerCase(); render(); });

  function visibleFieldKeys() {
    return schema.fields.slice(0, 5).map((f) => f.key);
  }

  function render() {
    const keys = visibleFieldKeys();
    const filtered = allDocs.filter((d) => !searchTerm || JSON.stringify(d).toLowerCase().includes(searchTerm));
    const table = h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [...keys.map((k) => h('th', {}, schema.fields.find((f) => f.key === k)?.label || k)), h('th', {}, 'Hành động')])),
      h('tbody', {}, filtered.length ? filtered.map((doc) => h('tr', { style: pendingDeletes.has(doc.id) ? 'opacity:.4' : '' }, [
        ...keys.map((k) => h('td', {}, formatCell(doc[k]))),
        h('td', { style: 'display:flex;gap:6px' }, [
          h('button', { class: 'btn btn--ghost btn--small', onClick: () => openEditor(doc) }, 'Sửa'),
          h('button', { class: 'btn btn--ghost btn--small', onClick: () => cloneDoc(doc) }, 'Nhân bản'),
          h('button', { class: 'btn btn--danger btn--small', onClick: () => scheduleDelete(doc) }, pendingDeletes.has(doc.id) ? 'Hoàn tác' : 'Xoá'),
        ]),
      ])) : [h('tr', {}, h('td', { colspan: keys.length + 1, class: 'empty-state' }, 'Chưa có dữ liệu.'))]),
    ]);
    tableWrap.replaceChildren(table);
  }

  function formatCell(v) {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? '✅' : '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function scheduleDelete(doc) {
    if (pendingDeletes.has(doc.id)) {
      scope.clearTimeout(pendingDeletes.get(doc.id));
      pendingDeletes.delete(doc.id);
      render();
      return;
    }
    const timeoutId = scope.setTimeout(async () => {
      pendingDeletes.delete(doc.id);
      try {
        await deleteRegistryDoc(schema.registry, doc.id, doc);
        showToast(`Đã xoá "${doc.id}".`, { type: 'success' });
      } catch (err) {
        showToast(err.message, { type: 'error' });
      }
    }, 10000);
    pendingDeletes.set(doc.id, timeoutId);
    showToast(`Sẽ xoá "${doc.id}" sau 10 giây — nhấn "Hoàn tác" để huỷ.`, { type: 'info', duration: 10000 });
    render();
  }

  function cloneDoc(doc) {
    const clone = { ...doc, id: `${doc.id}-copy-${Date.now().toString(36)}` };
    openEditor(clone, true);
  }

  function openEditor(doc, forceCreate = false) {
    const isNew = !doc || forceCreate;
    const form = h('form', {}, schema.fields.map((field) => h('div', { class: 'field' }, [
      h('label', {}, field.label + (field.required ? ' *' : '')),
      fieldInput(field, doc?.[field.key]),
    ])));
    const errorEl = h('p', { class: 'field-error' });
    const submitBtn = h('button', { class: 'btn btn--primary', type: 'submit' }, isNew ? 'Tạo mới' : 'Lưu thay đổi');
    form.append(errorEl, h('div', { class: 'dialog-actions' }, [submitBtn]));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = readForm(form, schema);
        for (const field of schema.fields) {
          if (field.required && (data[field.key] === '' || data[field.key] == null)) {
            throw new Error(`"${field.label}" là bắt buộc.`);
          }
        }
        const id = data[schema.idField];
        await upsertRegistryDoc(schema.registry, id, data, { action: isNew ? 'create' : 'update', oldValue: doc || null });
        showToast('Đã lưu.', { type: 'success' });
        close();
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
    const close = openModal(h('div', {}, [h('h3', {}, isNew ? 'Thêm mới' : `Sửa "${doc.id}"`), form]));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(allDocs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `${schema.registry}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJsonPrompt() {
    const input = h('input', { type: 'file', accept: 'application/json' });
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('File JSON phải là một mảng.');
        for (const item of arr) {
          await upsertRegistryDoc(schema.registry, item[schema.idField], item, { action: 'import' });
        }
        showToast(`Đã nhập ${arr.length} bản ghi.`, { type: 'success' });
      } catch (err) {
        showToast(err.message, { type: 'error' });
      }
    });
    input.click();
  }

  const unsub = subscribeCollection(schema.registry, (docs) => { allDocs = docs; render(); });
  scope.trackUnsubscribe(unsub);
  render();

  return { destroy() {} };
}
