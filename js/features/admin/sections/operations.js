import { h } from '../../../core/ui.js';
import { doc, onBalanceChange, writeAuditLog, writeBatch, collection, query, where, getDocs } from '../../../core/db.js';
import { db } from '../../../core/firebase.js';
import { confirmDangerous } from '../../../core/dialog.js';
import { showToast } from '../../../core/toast.js';

const STEAL_FIELDS = [
  { key: 'enabled', label: 'Bật ăn trộm', type: 'boolean' },
  { key: 'cooldownSeconds', label: 'Cooldown (giây)', type: 'number' },
  { key: 'dailyLimit', label: 'Giới hạn/ngày (0=không giới hạn)', type: 'number' },
  { key: 'energyCost', label: 'Chi phí năng lượng', type: 'number' },
  { key: 'successRate', label: 'Tỉ lệ thành công (0-100)', type: 'number' },
];

export function mountOperations(container, scope) {
  container.append(h('h2', {}, '🛠️ Vận hành nâng cao'));

  // ---- Steal Master ----
  const stealCard = h('div', { class: 'card' });
  stealCard.append(h('h3', {}, '🥷 Steal Master'));
  let steal = {};
  function renderSteal() {
    const inputs = {};
    const rows = STEAL_FIELDS.map((f) => {
      const input = f.type === 'boolean'
        ? h('input', { type: 'checkbox', checked: !!steal[f.key] })
        : h('input', { class: 'input', type: 'number', value: steal[f.key] ?? 0 });
      inputs[f.key] = input;
      return h('div', { class: 'field', style: 'display:flex;align-items:center;gap:8px;flex-direction:row' }, [h('label', { style: 'min-width:220px' }, f.label), input]);
    });
    stealCard.replaceChildren(
      h('h3', {}, '🥷 Steal Master'), ...rows,
      h('button', { class: 'btn btn--primary btn--small', onClick: () => saveSteal(inputs) }, 'Lưu'),
      h('button', { class: 'btn btn--danger btn--small', onClick: resetStealHistory }, 'Reset lịch sử ăn trộm'),
    );
  }
  async function saveSteal(inputs) {
    const data = Object.fromEntries(STEAL_FIELDS.map((f) => [f.key, f.type === 'boolean' ? inputs[f.key].checked : Number(inputs[f.key].value) || 0]));
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'balance'), { steal: data }, { merge: true });
    await writeAuditLog(batch, { action: 'update_steal', target: 'settings/balance.steal', newValue: data });
    await batch.commit();
    showToast('Đã lưu cấu hình ăn trộm.', { type: 'success' });
  }
  async function resetStealHistory() {
    const ok = await confirmDangerous({ title: 'Reset lịch sử ăn trộm', message: 'Toàn bộ lịch sử ăn trộm sẽ bị xoá khỏi bảng xếp hạng.' });
    if (!ok) return;
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'balance'), { steal: { resetAt: Date.now() } }, { merge: true });
    await writeAuditLog(batch, { action: 'reset_steal_history', target: 'settings/balance.steal' });
    await batch.commit();
    showToast('Đã reset lịch sử ăn trộm.', { type: 'success' });
  }

  // ---- Cooldown Master ----
  const cooldownCard = h('div', { class: 'card', style: 'margin-top:var(--space-4)' }, [
    h('h3', {}, '⏱️ Cooldown Master'),
    h('p', { class: 'field-hint' }, 'Đặt lại cooldown cho một người chơi cụ thể (game, ăn trộm, nông trại, cửa hàng, nhiệm vụ, năng lượng, sự kiện).'),
  ]);
  const uidInput = h('input', { class: 'input', placeholder: 'UID người chơi (để trống = reset cho tất cả)' });
  const resetAllBtn = h('button', { class: 'btn btn--danger btn--small', onClick: resetCooldowns }, 'Reset cooldown');
  cooldownCard.append(uidInput, resetAllBtn);
  async function resetCooldowns() {
    const uid = uidInput.value.trim();
    const ok = await confirmDangerous({ title: 'Reset cooldown', message: uid ? `Reset toàn bộ cooldown cho ${uid}?` : 'Reset cooldown cho TẤT CẢ người chơi? Việc này chạy theo batch.' });
    if (!ok) return;
    const batch = writeBatch(db);
    await writeAuditLog(batch, { action: 'reset_cooldowns', target: uid || 'all-users' });
    await batch.commit();
    showToast('Đã ghi nhận yêu cầu reset cooldown.', { type: 'success' });
  }

  // ---- Spawn Control ----
  const spawnCard = h('div', { class: 'card', style: 'margin-top:var(--space-4)' }, [
    h('h3', {}, '🌾 Spawn Control'),
    h('p', { class: 'field-hint' }, 'Ép buộc xuất hiện vật phẩm hiếm/huyền thoại và đặt lại thời gian restock (áp dụng cho registry crops/shopItems).'),
    h('button', { class: 'btn btn--secondary btn--small', onClick: () => forceFlag('forceRareSpawn') }, 'Force Rare Spawn'),
    h('button', { class: 'btn btn--secondary btn--small', onClick: () => forceFlag('forceLegendarySpawn') }, 'Force Legendary Spawn'),
    h('button', { class: 'btn btn--secondary btn--small', onClick: () => forceFlag('forceRestock') }, 'Force Restock'),
  ]);
  async function forceFlag(key) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'balance'), { spawn: { [key]: Date.now() } }, { merge: true });
    await writeAuditLog(batch, { action: key, target: 'settings/balance.spawn' });
    await batch.commit();
    showToast(`Đã kích hoạt "${key}".`, { type: 'success' });
  }

  // ---- Leaderboard Master ----
  const leaderboardCard = h('div', { class: 'card', style: 'margin-top:var(--space-4)' }, [
    h('h3', {}, '🏆 Leaderboard Master'),
    h('button', { class: 'btn btn--danger btn--small', onClick: () => leaderboardAction('reset') }, 'Reset bảng xếp hạng'),
    h('button', { class: 'btn btn--secondary btn--small', onClick: () => leaderboardAction('archive') }, 'Lưu trữ mùa hiện tại'),
    h('button', { class: 'btn btn--primary btn--small', onClick: () => leaderboardAction('new-season') }, 'Bắt đầu mùa mới'),
  ]);
  async function leaderboardAction(action) {
    const ok = await confirmDangerous({ title: `Xác nhận: ${action}`, message: 'Thao tác này ảnh hưởng tới toàn bộ bảng xếp hạng.' });
    if (!ok) return;
    const batch = writeBatch(db);
    const seasonId = `season-${Date.now()}`;
    batch.set(doc(db, 'settings', 'balance'), { leaderboard: { lastAction: action, at: Date.now(), seasonId } }, { merge: true });
    await writeAuditLog(batch, { action: `leaderboard_${action}`, target: 'leaderboards' });
    await batch.commit();
    showToast(`Đã thực hiện "${action}".`, { type: 'success' });
  }

  container.append(stealCard, cooldownCard, spawnCard, leaderboardCard);

  const unsub = onBalanceChange((balance) => { steal = balance?.steal || {}; renderSteal(); });
  scope.trackUnsubscribe(unsub);
  renderSteal();

  return { destroy() {} };
}
