import { h, formatNumber } from '../../../core/ui.js';
import { doc, getDoc, setDoc, increment, collection, query, orderBy, limit, getDocs, writeAuditLog, writeBatch } from '../../../core/db.js';
import { db } from '../../../core/firebase.js';
import { showToast } from '../../../core/toast.js';
import { CURRENCIES } from '../../../config/economy.js';

export function mountUserControl(container) {
  container.append(h('h2', {}, '👥 Quản lý người chơi'));
  const searchRow = h('div', { style: 'display:flex;gap:8px' });
  const uidInput = h('input', { class: 'input', placeholder: 'Dán UID người chơi', style: 'max-width:320px' });
  const searchBtn = h('button', { class: 'btn btn--primary', onClick: () => loadUser(uidInput.value.trim()) }, 'Tìm');
  searchRow.append(uidInput, searchBtn);

  const recentList = h('div', { class: 'table-wrap', style: 'margin-top:var(--space-3)' });
  const detailPanel = h('div', { style: 'margin-top:var(--space-4)' });
  container.append(searchRow, recentList, detailPanel);

  async function loadRecent() {
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(20)));
      recentList.replaceChildren(h('table', { class: 'data-table' }, [
        h('thead', {}, h('tr', {}, ['Tên', 'UID', ''].map((t) => h('th', {}, t)))),
        h('tbody', {}, snap.docs.map((d) => h('tr', {}, [
          h('td', {}, d.data().displayName || ''),
          h('td', {}, d.id),
          h('td', {}, h('button', { class: 'btn btn--ghost btn--small', onClick: () => loadUser(d.id) }, 'Xem')),
        ]))),
      ]));
    } catch { recentList.replaceChildren(); }
  }

  async function loadUser(uid) {
    if (!uid) return;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) { showToast('Không tìm thấy người chơi.', { type: 'error' }); return; }
    const data = snap.data();
    renderDetail(uid, data);
  }

  function renderDetail(uid, data) {
    const wallet = data.wallet || {};
    const currencyRows = Object.values(CURRENCIES).map((c) => {
      const amtInput = h('input', { class: 'input', type: 'number', value: '0', style: 'max-width:100px' });
      const reasonInput = h('input', { class: 'input', placeholder: 'Lý do', style: 'max-width:200px' });
      return h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:8px' }, [
        h('span', { style: 'min-width:140px' }, `${c.icon} ${c.name}: ${formatNumber(wallet[c.id] || 0)}`),
        amtInput, reasonInput,
        h('button', { class: 'btn btn--secondary btn--small', onClick: () => adjustWallet(uid, c.id, Number(amtInput.value) || 0, reasonInput.value) }, 'Áp dụng'),
      ]);
    });

    detailPanel.replaceChildren(h('div', { class: 'card' }, [
      h('h3', {}, `${data.displayName || 'Người chơi'} · ${uid}`),
      h('p', {}, `Cấp ${data.level || 1} · ${formatNumber(data.exp || 0)} EXP`),
      ...currencyRows,
      h('div', { style: 'display:flex;gap:8px;margin-top:var(--space-3)' }, [
        h('button', { class: `btn btn--small ${data.locked ? 'btn--secondary' : 'btn--ghost'}`, onClick: () => toggleField(uid, 'locked', !data.locked) }, data.locked ? 'Mở khoá' : 'Khoá tài khoản'),
        h('button', { class: `btn btn--small ${data.banned ? 'btn--secondary' : 'btn--danger'}`, onClick: () => toggleField(uid, 'banned', !data.banned) }, data.banned ? 'Gỡ cấm' : 'Cấm tài khoản'),
      ]),
    ]));
  }

  async function adjustWallet(uid, currencyId, amount, reason) {
    if (!amount) return;
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), { wallet: { [currencyId]: increment(amount) } }, { merge: true });
    await writeAuditLog(batch, { action: 'admin_adjust_wallet', target: `users/${uid}`, newValue: { currencyId, amount, reason: reason || '(không có lý do)' } });
    await batch.commit();
    showToast('Đã cập nhật ví người chơi.', { type: 'success' });
    loadUser(uid);
  }

  async function toggleField(uid, field, value) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), { [field]: value }, { merge: true });
    await writeAuditLog(batch, { action: `admin_set_${field}`, target: `users/${uid}`, newValue: value });
    await batch.commit();
    loadUser(uid);
  }

  loadRecent();
  return { destroy() {} };
}
