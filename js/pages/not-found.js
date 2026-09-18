import { h } from '../core/ui.js';

export default {
  mount(container) {
    container.append(h('div', { class: 'empty-state' }, [
      h('p', {}, '🐝 Ong tìm hoài mà không thấy trang này…'),
      h('a', { class: 'btn btn--primary', href: '#/' }, 'Về Trang chủ'),
    ]));
  },
  destroy() {},
};
