import { h } from '../../../core/ui.js';
import { doc, setDoc, increment, writeAuditLog, writeBatch } from '../../../core/db.js';
import { db } from '../../../core/firebase.js';
import { getCurrentUser } from '../../../core/auth.js';
import { showToast } from '../../../core/toast.js';
import { CURRENCIES } from '../../../config/economy.js';

export function mountOwnerInventory(container) {
  container.append(h('h2', {}, '🎒 Kho đồ chủ nhà'));

  const currencyForm = h('div', { class: 'card' }, [
    h('h3', {}, 'Cộng tiền tệ cho bản thân'),
    ...Object.values(CURRENCIES).map((c) => {
      const input = h('input', { class: 'input', type: 'number', value: '0', style: 'max-width:120px;display:inline-block' });
      const btn = h('button', { class: 'btn btn--primary btn--small', onClick: () => addCurrency(c.id, Number(input.value) || 0, c.name) }, `+ ${c.icon}`);
      return h('div', { class: 'field', style: 'display:flex;gap:8px;align-items:center;flex-direction:row' }, [h('label', { style: 'min-width:140px' }, c.name), input, btn]);
    }),
  ]);

  const itemForm = h('div', { class: 'card', style: 'margin-top:var(--space-4)' }, [
    h('h3', {}, 'Thêm vật phẩm cho bản thân'),
  ]);
  const itemIdInput = h('input', { class: 'input', placeholder: 'Mã vật phẩm (VD: non-la)' });
  const itemQtyInput = h('input', { class: 'input', type: 'number', value: '1', style: 'max-width:100px' });
  itemForm.append(
    h('div', { class: 'field' }, [h('label', {}, 'Mã vật phẩm'), itemIdInput]),
    h('div', { class: 'field' }, [h('label', {}, 'Số lượng'), itemQtyInput]),
    h('button', { class: 'btn btn--primary', onClick: addItem }, 'Thêm vào túi đồ'),
  );

  container.append(currencyForm, itemForm);

  async function addCurrency(currencyId, amount, label) {
    const user = getCurrentUser();
    if (!user || !amount) return;
    const ref = doc(db, 'users', user.uid);
    const batch = writeBatch(db);
    batch.set(ref, { wallet: { [currencyId]: increment(amount) } }, { merge: true });
    await writeAuditLog(batch, { action: 'owner_add_currency', target: `users/${user.uid}`, newValue: { [currencyId]: amount } });
    await batch.commit();
    showToast(`Đã cộng ${amount} ${label}.`, { type: 'success' });
  }

  async function addItem() {
    const user = getCurrentUser();
    if (!user || !itemIdInput.value.trim()) return;
    const itemId = itemIdInput.value.trim();
    const qty = Number(itemQtyInput.value) || 1;
    const ref = doc(db, 'users', user.uid, 'inventory', itemId);
    const batch = writeBatch(db);
    batch.set(ref, { itemId, qty: increment(qty) }, { merge: true });
    await writeAuditLog(batch, { action: 'owner_add_item', target: `users/${user.uid}/inventory/${itemId}`, newValue: { qty } });
    await batch.commit();
    showToast(`Đã thêm ${qty}× ${itemId}.`, { type: 'success' });
  }

  return { destroy() {} };
}
