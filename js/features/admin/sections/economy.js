import { h, formatNumber } from '../../../core/ui.js';
import { doc, setDoc, onBalanceChange, writeAuditLog, writeBatch } from '../../../core/db.js';
import { db } from '../../../core/firebase.js';
import { showToast } from '../../../core/toast.js';

const MULTIPLIER_FIELDS = [
  { key: 'reward', label: 'Nhân thưởng chung' },
  { key: 'sell', label: 'Nhân giá bán nông trại' },
  { key: 'shopPrice', label: 'Nhân giá cửa hàng' },
  { key: 'exp', label: 'Nhân EXP' },
  { key: 'event', label: 'Nhân sự kiện' },
];
const LIMIT_FIELDS = [
  { key: 'dailyEarningLimit', label: 'Giới hạn thu nhập/ngày (0 = không giới hạn)' },
  { key: 'gameRewardLimit', label: 'Giới hạn thưởng game/ngày' },
  { key: 'farmIncomeLimit', label: 'Giới hạn thu nhập nông trại/ngày' },
];

export function mountEconomyMaster(container, scope) {
  container.append(h('h2', {}, '💰 Kinh tế'));
  const form = h('div', { class: 'card' });
  const preview = h('div', { class: 'card', style: 'margin-top:var(--space-4)' });
  container.append(form, preview);

  let current = { multipliers: {}, limits: {} };

  function renderForm() {
    const inputs = {};
    const rows = [
      h('h3', {}, 'Hệ số nhân'),
      ...MULTIPLIER_FIELDS.map((f) => {
        const input = h('input', { class: 'input', type: 'number', step: '0.1', value: current.multipliers?.[f.key] ?? 1 });
        inputs[f.key] = input;
        input.addEventListener('input', updatePreview);
        return h('div', { class: 'field' }, [h('label', {}, f.label), input]);
      }),
      h('h3', {}, 'Giới hạn hằng ngày'),
      ...LIMIT_FIELDS.map((f) => {
        const input = h('input', { class: 'input', type: 'number', value: current.limits?.[f.key] ?? 0 });
        inputs[f.key] = input;
        return h('div', { class: 'field' }, [h('label', {}, f.label), input]);
      }),
    ];
    const saveBtn = h('button', { class: 'btn btn--primary', onClick: () => save(inputs) }, 'Lưu cấu hình kinh tế');
    form.replaceChildren(...rows, saveBtn);
    updatePreview();
  }

  function updatePreview() {
    const rewardMult = Number(form.querySelector('input')?.value) || 1;
    const exampleScore = 100;
    preview.replaceChildren(
      h('h3', {}, 'Xem trước'),
      h('p', {}, `Một lượt chơi đạt ${exampleScore} điểm sẽ nhận khoảng ${formatNumber(exampleScore * 0.5 * rewardMult)} 🌻 (trước khi áp trần theo độ khó).`),
    );
  }

  async function save(inputs) {
    const multipliers = Object.fromEntries(MULTIPLIER_FIELDS.map((f) => [f.key, Number(inputs[f.key].value) || 1]));
    const limits = Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, Number(inputs[f.key].value) || 0]));
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'balance'), { economy: { multipliers, limits } }, { merge: true });
    await writeAuditLog(batch, { action: 'update_economy', target: 'settings/balance', newValue: { multipliers, limits } });
    await batch.commit();
    showToast('Đã lưu cấu hình kinh tế.', { type: 'success' });
  }

  const unsub = onBalanceChange((balance) => {
    current = balance?.economy || {};
    renderForm();
  });
  scope.trackUnsubscribe(unsub);
  renderForm();

  return { destroy() {} };
}
