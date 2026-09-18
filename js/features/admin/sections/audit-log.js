import { h } from '../../../core/ui.js';
import { collection, query, orderBy, limit, getDocs } from '../../../core/db.js';
import { db } from '../../../core/firebase.js';

export function mountAuditLog(container) {
  container.append(h('h2', {}, '📝 Nhật ký quản trị'));
  const filterRow = h('div', { style: 'display:flex;gap:8px;margin-bottom:var(--space-3);flex-wrap:wrap' });
  const adminFilter = h('input', { class: 'input', placeholder: 'Lọc theo adminId', style: 'max-width:200px' });
  const actionFilter = h('input', { class: 'input', placeholder: 'Lọc theo action', style: 'max-width:200px' });
  const exportBtn = h('button', { class: 'btn btn--ghost btn--small' }, '⬇️ Xuất CSV');
  filterRow.append(adminFilter, actionFilter, exportBtn);
  const tableWrap = h('div', { class: 'table-wrap' });
  container.append(filterRow, tableWrap);

  let rows = [];

  function render() {
    const filtered = rows.filter((r) =>
      (!adminFilter.value || r.adminId?.includes(adminFilter.value)) &&
      (!actionFilter.value || r.action?.includes(actionFilter.value)),
    );
    tableWrap.replaceChildren(h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, ['Thời gian', 'Admin', 'Hành động', 'Đối tượng', 'Giá trị cũ', 'Giá trị mới'].map((t) => h('th', {}, t)))),
      h('tbody', {}, filtered.length ? filtered.map((r) => h('tr', {}, [
        h('td', {}, r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString('vi-VN') : ''),
        h('td', {}, r.adminId || ''),
        h('td', {}, r.action || ''),
        h('td', {}, r.target || ''),
        h('td', {}, JSON.stringify(r.oldValue ?? '')),
        h('td', {}, JSON.stringify(r.newValue ?? '')),
      ])) : [h('tr', {}, h('td', { colspan: 6, class: 'empty-state' }, 'Chưa có nhật ký.'))]),
    ]));
  }

  adminFilter.addEventListener('input', render);
  actionFilter.addEventListener('input', render);
  exportBtn.addEventListener('click', () => {
    const csv = ['timestamp,adminId,action,target,oldValue,newValue', ...rows.map((r) =>
      [r.timestamp?.toDate?.().toISOString() || '', r.adminId, r.action, r.target, JSON.stringify(r.oldValue ?? ''), JSON.stringify(r.newValue ?? '')]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','),
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'audit-logs.csv' });
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  (async () => {
    try {
      const snap = await getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200)));
      rows = snap.docs.map((d) => d.data());
    } catch { rows = []; }
    render();
  })();

  return { destroy() {} };
}
