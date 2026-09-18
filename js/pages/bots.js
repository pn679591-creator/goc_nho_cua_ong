import { h } from '../core/ui.js';
import { resolveAssetUrl, onImageError } from '../core/images.js';
import { subscribeCollection } from '../core/db.js';
import { DEFAULT_BOTS } from '../features/bots/default-bots.js';

function mergeRegistry(defaults, live) {
  const map = new Map(defaults.map((b) => [b.id, b]));
  for (const item of live) {
    if (item.disabled) { map.delete(item.id); continue; }
    map.set(item.id, { ...map.get(item.id), ...item });
  }
  return [...map.values()];
}

function renderGrid(grid, bots) {
  grid.replaceChildren(...bots.map((bot) => {
    const img = h('img', { src: resolveAssetUrl(bot.cover), alt: bot.name, width: 320, height: 400 });
    onImageError(img);
    return h('a', { href: `#/bots/${bot.id}`, class: 'bot-card' }, [
      h('div', { class: 'frame frame--bot-cover' }, [img]),
      h('div', { class: 'bot-card__body' }, [
        h('div', { class: 'bot-card__name' }, bot.name),
        h('div', { class: 'bot-card__tag' }, bot.tag),
      ]),
    ]);
  }));
}

export default {
  mount(container, { scope }) {
    container.append(h('h1', {}, '🐝 Bạn Ong'));
    const grid = h('div', { class: 'grid grid--bots' });
    container.append(grid);
    renderGrid(grid, DEFAULT_BOTS);
    const unsub = subscribeCollection('bots', (docs) => {
      renderGrid(grid, mergeRegistry(DEFAULT_BOTS, docs));
    });
    scope.trackUnsubscribe(unsub);
  },
  destroy() {},
};
