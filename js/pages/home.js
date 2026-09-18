import { h } from '../core/ui.js';
import { onImageError } from '../core/images.js';
import { getCurrentUser, onAuthReady } from '../core/auth.js';
import { subscribeUserDoc } from '../core/db.js';

const QUICK_LINKS = [
  { path: '/farm', icon: '🌱', label: 'Nông trại', desc: 'Trồng cây, thu hoạch mỗi ngày' },
  { path: '/arcade', icon: '🎮', label: 'Khu vui chơi', desc: '11 trò chơi nhỏ dễ thương' },
  { path: '/shop', icon: '🛒', label: 'Cửa hàng', desc: 'Đổi Hạt & Mật lấy vật phẩm' },
  { path: '/tarot', icon: '🔮', label: 'Tarot', desc: 'Rút một lá bài mỗi ngày' },
  { path: '/bots', icon: '🐝', label: 'Bạn Ong', desc: 'Gặp gỡ những người bạn nhỏ' },
];

const FALLBACK_LETTERS = [
  'Chào buổi sáng! Hôm nay Ong chúc bạn tràn đầy năng lượng như một giọt mật ong ngọt ngào. 🍯',
  'Dù hôm nay có bận rộn thế nào, nhớ dành chút thời gian nghỉ ngơi nhé. Ong luôn ở đây chờ bạn ghé thăm nông trại. 🌻',
  'Một ngày mới, một cơ hội mới để gieo thêm những hạt giống tốt đẹp. Chúc bạn ngày tốt lành! 🐝',
];

export default {
  async mount(container, { scope }) {
    const letter = FALLBACK_LETTERS[new Date().getDate() % FALLBACK_LETTERS.length];

    const banner = h('div', { class: 'frame frame--banner card' }, [
      h('img', { src: './assets/images/banner-home.svg', alt: 'Góc Nhỏ Của Ong', width: 960, height: 540 }),
    ]);
    onImageError(banner.querySelector('img'));

    const mascot = h('div', { class: 'frame frame--mascot' }, [
      h('img', { src: './assets/images/mascot.svg', alt: 'Ong chào bạn', width: 200, height: 200 }),
    ]);
    onImageError(mascot.querySelector('img'));

    const letterCard = h('div', { class: 'card' }, [
      h('h3', {}, '💌 Thư hôm nay từ Ong'),
      h('p', {}, letter),
    ]);

    const links = h('div', { class: 'grid grid--games' }, QUICK_LINKS.map((l) =>
      h('a', { href: `#${l.path}`, class: 'game-card' }, [
        h('div', { class: 'game-card__body' }, [
          h('div', { style: 'font-size:32px' }, l.icon),
          h('div', { class: 'game-card__name' }, l.label),
          h('p', { style: 'margin:0;color:var(--text-muted);font-size:13px' }, l.desc),
        ]),
      ]),
    ));

    container.append(
      h('div', { class: 'card', style: 'display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap' }, [mascot, h('div', { style: 'flex:1;min-width:200px' }, [h('h1', {}, 'Chào mừng đến Góc Nhỏ Của Ong!'), h('p', {}, 'Nơi bạn trồng cây, chơi game, rút bài Tarot và kết bạn với những chú Ong dễ thương.')])]),
      banner,
      letterCard,
      h('h2', {}, 'Bạn muốn làm gì hôm nay?'),
      links,
    );

    onAuthReady((user) => {
      if (!user) return;
      const unsub = subscribeUserDoc(user.uid, () => {});
      scope.trackUnsubscribe(unsub);
    });
  },
  destroy() {},
};
