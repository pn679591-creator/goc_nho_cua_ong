import { h } from '../core/ui.js';
import { resolveAssetUrl, onImageError } from '../core/images.js';
import { GAME_REGISTRY } from '../games/registry.js';
import { subscribeCollection, getFlags, onFlagsChange } from '../core/db.js';
import { isOwner } from '../core/auth.js';

export default {
  mount(container, { scope }) {
    container.append(h('h1', {}, '🎮 Khu vui chơi'));

    const flagNotice = h('div', { class: 'card', style: 'display:none' });
    container.append(flagNotice);

    const grid = h('div', { class: 'grid grid--games' });
    container.append(grid);

    let gameSettings = {};
    function render() {
      const flags = getFlags();
      if (flags.disableAllGames) {
        flagNotice.style.display = 'block';
        flagNotice.replaceChildren(h('p', {}, '🔧 Khu vui chơi đang tạm bảo trì, quay lại sau nhé!'));
      } else {
        flagNotice.style.display = 'none';
      }
      grid.replaceChildren(...GAME_REGISTRY.map((game) => {
        const setting = gameSettings[game.id] || {};
        const disabled = (flags.disableAllGames || setting.enabled === false) && !isOwner();
        const img = h('img', { src: resolveAssetUrl(game.cover), alt: game.label, width: 300, height: 300 });
        onImageError(img);
        const card = h('a', {
          href: disabled ? undefined : `#/arcade/${game.id}`,
          class: 'game-card',
          style: disabled ? 'opacity:.5;pointer-events:none' : '',
        }, [
          h('div', { class: 'frame frame--cartridge game-card__cartridge' }, [
            img,
            setting.enabled === false ? h('span', { class: 'badge badge--off game-card__status' }, 'Tạm khoá') : null,
          ]),
          h('div', { class: 'game-card__body' }, [h('div', { class: 'game-card__name' }, `${game.icon} ${game.label}`)]),
        ]);
        return card;
      }));
    }

    scope.trackUnsubscribe(onFlagsChange(render));
    scope.trackUnsubscribe(subscribeCollection('games', (docs) => {
      gameSettings = Object.fromEntries(docs.map((d) => [d.id, d]));
      render();
    }));
    render();
  },
  destroy() {},
};
