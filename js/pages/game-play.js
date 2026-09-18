import { h } from '../core/ui.js';
import { getGameMeta } from '../games/registry.js';
import { mountGameShell } from '../games/shared/game-shell.js';

let shellHandle = null;

export default {
  async mount(container, { params, scope }) {
    const meta = getGameMeta(params.id);
    if (!meta) {
      container.append(h('div', { class: 'empty-state' }, [
        h('p', {}, 'Không tìm thấy trò chơi này.'),
        h('a', { class: 'btn btn--primary', href: '#/arcade' }, 'Về Khu vui chơi'),
      ]));
      return;
    }
    const loadingEl = h('div', { class: 'empty-state' }, 'Đang tải trò chơi…');
    container.append(loadingEl);
    const mod = await meta.loader();
    loadingEl.remove();
    shellHandle = mountGameShell(container, scope, {
      gameId: meta.id,
      label: meta.label,
      createGame: mod.createGame,
    });
  },
  destroy() {
    shellHandle?.destroy();
    shellHandle = null;
  },
};
