import { h } from '../../../core/ui.js';
import { doc, setDoc, onFlagsChange, writeAuditLog, writeBatch } from '../../../core/db.js';
import { db } from '../../../core/firebase.js';
import { confirmDangerous } from '../../../core/dialog.js';
import { showToast } from '../../../core/toast.js';

const FLAGS = [
  { key: 'disableAllGames', label: 'Tắt toàn bộ trò chơi' },
  { key: 'disableEconomy', label: 'Tắt hệ thống kinh tế' },
  { key: 'disableShop', label: 'Tắt cửa hàng' },
  { key: 'disableSteal', label: 'Tắt tính năng ăn trộm' },
  { key: 'disableFarm', label: 'Tắt nông trại' },
  { key: 'disableUserUpload', label: 'Tắt tải ảnh lên' },
  { key: 'maintenanceMode', label: 'Chế độ bảo trì toàn site' },
];

export function mountEmergency(container, scope) {
  container.append(h('h2', {}, '🚨 Chế độ khẩn cấp'));
  const list = h('div', { class: 'card' });
  container.append(list);

  let flags = {};

  function render() {
    list.replaceChildren(...FLAGS.map((f) => {
      const active = !!flags[f.key];
      return h('div', { class: 'field', style: 'display:flex;align-items:center;justify-content:space-between;flex-direction:row' }, [
        h('label', {}, f.label),
        h('button', { class: `btn btn--small ${active ? 'btn--danger' : 'btn--ghost'}`, onClick: () => toggle(f.key, !active) }, active ? 'Đang BẬT — tắt đi' : 'Đang tắt — bật lên'),
      ]);
    }));
  }

  async function toggle(key, value) {
    if (value) {
      const ok = await confirmDangerous({ title: `Bật "${key}"?`, message: 'Thao tác này sẽ ảnh hưởng ngay lập tức tới mọi người chơi.' });
      if (!ok) return;
    }
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'public'), { flags: { [key]: value } }, { merge: true });
    await writeAuditLog(batch, { action: 'toggle_flag', target: `settings/public.flags.${key}`, newValue: value });
    await batch.commit();
    showToast(`Đã ${value ? 'bật' : 'tắt'} "${key}".`, { type: 'success' });
  }

  const unsub = onFlagsChange((f) => { flags = f; render(); });
  scope.trackUnsubscribe(unsub);
  render();

  return { destroy() {} };
}
