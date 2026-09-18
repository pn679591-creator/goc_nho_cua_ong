import { h, formatNumber } from '../../../core/ui.js';
import { collection, getDocs, query, where, limit } from '../../../core/db.js';
import { db } from '../../../core/firebase.js';

const STATS = [
  { key: 'users', label: 'Tổng người chơi', col: 'users' },
  { key: 'farms', label: 'Tổng nông trại', col: 'farms' },
  { key: 'gameRuns', label: 'Lượt chơi (mẫu gần nhất)', col: 'gameRuns', capped: true },
  { key: 'tarotReadings', label: 'Lượt rút Tarot (mẫu)', col: 'tarotReadings', capped: true },
  { key: 'auditLogs', label: 'Thao tác quản trị (mẫu)', col: 'auditLogs', capped: true },
];

export function mountOverview(container, scope) {
  const grid = h('div', { class: 'grid grid--bots' });
  const refreshBtn = h('button', { class: 'btn btn--secondary', onClick: () => load() }, '🔄 Làm mới');
  container.append(h('div', { class: 'section-title' }, [h('h2', {}, '📊 Tổng quan'), refreshBtn]), grid);

  async function load() {
    grid.replaceChildren(h('p', {}, 'Đang tải…'));
    const results = await Promise.all(STATS.map(async (s) => {
      try {
        const q = s.capped ? query(collection(db, s.col), limit(500)) : collection(db, s.col);
        const snap = await getDocs(q);
        return { ...s, count: snap.size };
      } catch {
        return { ...s, count: '—' };
      }
    }));
    grid.replaceChildren(...results.map((r) => h('div', { class: 'card' }, [
      h('p', { class: 'field-hint' }, r.label + (r.capped ? ' (tối đa 500)' : '')),
      h('p', { style: 'font-size:28px;font-weight:800;margin:0' }, typeof r.count === 'number' ? formatNumber(r.count) : r.count),
    ])));
  }

  load();
  return { destroy() {} };
}
