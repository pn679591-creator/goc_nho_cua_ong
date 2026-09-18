import { h } from '../core/ui.js';
import { resolveAssetUrl, onImageError } from '../core/images.js';
import { getDoc, doc } from '../core/db.js';
import { db } from '../core/firebase.js';
import { DEFAULT_BOTS } from '../features/bots/default-bots.js';

export default {
  async mount(container, { params }) {
    let bot = DEFAULT_BOTS.find((b) => b.id === params.id) || null;
    try {
      const snap = await getDoc(doc(db, 'bots', params.id));
      if (snap.exists()) bot = { ...bot, id: snap.id, ...snap.data() };
    } catch { /* dùng dữ liệu mặc định nếu Firestore chưa sẵn sàng */ }

    if (!bot) {
      container.append(h('div', { class: 'empty-state' }, [
        h('p', {}, 'Không tìm thấy Bạn Ong này.'),
        h('a', { class: 'btn btn--primary', href: '#/bots' }, 'Về danh sách'),
      ]));
      return;
    }

    const img = h('img', { src: resolveAssetUrl(bot.cover), alt: bot.name, width: 320, height: 400 });
    onImageError(img);

    container.append(
      h('a', { href: '#/bots', class: 'btn btn--ghost btn--small' }, '← Danh sách'),
      h('div', { class: 'card', style: 'display:flex;gap:var(--space-5);flex-wrap:wrap;margin-top:var(--space-3)' }, [
        h('div', { class: 'frame frame--bot-cover', style: 'width:min(100%,260px)' }, [img]),
        h('div', { style: 'flex:1;min-width:220px' }, [
          h('h1', {}, bot.name),
          h('p', { class: 'badge badge--on' }, bot.tag || ''),
          h('p', {}, bot.bio || ''),
        ]),
      ]),
    );
  },
  destroy() {},
};
