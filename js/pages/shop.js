import { h, formatNumber } from '../core/ui.js';
import { resolveAssetUrl, onImageError } from '../core/images.js';
import { DEFAULT_SHOP_ITEMS } from '../features/shop/default-items.js';
import { subscribeCollection, doc, runTransaction, increment, onFlagsChange, getFlags } from '../core/db.js';
import { db } from '../core/firebase.js';
import { getCurrentUser } from '../core/auth.js';
import { showToast } from '../core/toast.js';
import { confirmDialog } from '../core/dialog.js';
import { CURRENCIES } from '../config/economy.js';

export default {
  mount(container, { scope }) {
    container.append(h('h1', {}, '🛒 Cửa hàng'));
    const notice = h('div', { style: 'display:none' });
    const grid = h('div', { class: 'grid grid--games' });
    container.append(notice, grid);

    let items = DEFAULT_SHOP_ITEMS;

    function render() {
      const flags = getFlags();
      if (flags.disableShop) {
        notice.style.display = 'block';
        notice.replaceChildren(h('div', { class: 'card' }, 'Cửa hàng đang tạm đóng cửa.'));
        grid.replaceChildren();
        return;
      }
      notice.style.display = 'none';
      grid.replaceChildren(...items.map((item) => {
        const currency = CURRENCIES[item.currency] || CURRENCIES.coin;
        const outOfStock = item.stock > 0 && (item.soldCount || 0) >= item.stock;
        const img = h('img', { src: resolveAssetUrl(item.image), alt: item.name, width: 120, height: 120 });
        onImageError(img);
        return h('div', { class: 'shop-card' }, [
          h('div', { class: 'frame frame--cartridge' }, [img]),
          h('div', { class: 'shop-card__body' }, [
            h('div', { class: 'game-card__name' }, item.name),
            h('p', { style: 'margin:4px 0' }, `${currency.icon} ${formatNumber(item.price)}`),
            item.stock > 0 ? h('p', { class: 'field-hint' }, `Còn ${Math.max(0, item.stock - (item.soldCount || 0))}`) : null,
            h('button', { class: 'btn btn--primary btn--block', disabled: outOfStock, onClick: () => buy(item) }, outOfStock ? 'Hết hàng' : 'Mua'),
          ]),
        ]);
      }));
    }

    async function buy(item) {
      const user = getCurrentUser();
      if (!user) return;
      const currency = CURRENCIES[item.currency] || CURRENCIES.coin;
      const ok = await confirmDialog({ title: 'Xác nhận mua', message: `Mua "${item.name}" với giá ${currency.icon} ${formatNumber(item.price)}?`, confirmText: 'Mua ngay' });
      if (!ok) return;
      const userRef = doc(db, 'users', user.uid);
      const invRef = doc(db, 'users', user.uid, 'inventory', item.id);
      try {
        await runTransaction(db, async (tx) => {
          const userSnap = await tx.get(userRef);
          const wallet = userSnap.data()?.wallet || {};
          if ((wallet[item.currency] || 0) < item.price) throw new Error(`Không đủ ${currency.name}.`);
          const invSnap = await tx.get(invRef);
          tx.set(userRef, { wallet: { [item.currency]: increment(-item.price) } }, { merge: true });
          tx.set(invRef, { itemId: item.id, qty: (invSnap.data()?.qty || 0) + 1 }, { merge: true });
        });
        showToast(`Đã mua "${item.name}"! 🎉`, { type: 'success' });
      } catch (err) {
        showToast(err.message || 'Không thể mua vật phẩm này.', { type: 'error' });
      }
    }

    scope.trackUnsubscribe(onFlagsChange(render));
    scope.trackUnsubscribe(subscribeCollection('shopItems', (docs) => {
      if (!docs.length) return;
      const map = new Map(DEFAULT_SHOP_ITEMS.map((c) => [c.id, c]));
      for (const it of docs) {
        if (it.disabled) { map.delete(it.id); continue; }
        map.set(it.id, { ...map.get(it.id), ...it });
      }
      items = [...map.values()];
      render();
    }));
    render();
  },
  destroy() {},
};
