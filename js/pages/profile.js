import { h, formatNumber } from '../core/ui.js';
import { resolveAssetUrl, onImageError } from '../core/images.js';
import { getCurrentUser, onAuthReady, signInWithGoogle, signOutUser } from '../core/auth.js';
import { subscribeUserDoc, subscribeCollection, computeCurrentEnergy, getEconomySettings, doc, updateDoc } from '../core/db.js';
import { db } from '../core/firebase.js';
import { CURRENCIES } from '../config/economy.js';
import { showToast } from '../core/toast.js';

export default {
  mount(container, { scope }) {
    container.append(h('h1', {}, '👤 Hồ sơ của bạn'));
    const card = h('div', { class: 'card' }, 'Đang tải…');
    const inventoryCard = h('div', { class: 'card', style: 'margin-top:var(--space-4)' });
    container.append(card, inventoryCard);

    onAuthReady((user) => {
      if (!user) return;

      function renderProfile(data) {
        if (!data) return;
        const economy = getEconomySettings();
        const wallet = data.wallet || {};
        const avatar = h('img', { src: resolveAssetUrl(data.photoURL || 'placeholder.svg'), alt: data.displayName, width: 104, height: 104 });
        onImageError(avatar);

        const nameInput = h('input', { class: 'input', value: data.displayName || '', style: 'max-width:260px' });

        card.replaceChildren(
          h('div', { style: 'display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap' }, [
            h('div', { class: 'frame frame--avatar' }, [avatar]),
            h('div', { style: 'flex:1;min-width:200px' }, [
              h('div', { class: 'field' }, [h('label', {}, 'Tên hiển thị'), nameInput]),
              h('button', { class: 'btn btn--secondary btn--small', onClick: async () => {
                try {
                  await updateDoc(doc(db, 'users', user.uid), { displayName: nameInput.value.trim() || 'Người bạn của Ong' });
                  showToast('Đã lưu tên hiển thị.', { type: 'success' });
                } catch { showToast('Không thể lưu tên.', { type: 'error' }); }
              } }, 'Lưu tên'),
              h('p', {}, `Cấp độ ${data.level || 1} · ${formatNumber(data.exp || 0)} EXP`),
            ]),
          ]),
          h('div', { class: 'game-hud', style: 'margin-top:var(--space-4)' }, [
            h('span', { class: 'game-hud__item' }, `${CURRENCIES.coin.icon} ${formatNumber(wallet.coin || 0)}`),
            h('span', { class: 'game-hud__item' }, `${CURRENCIES.gem.icon} ${formatNumber(wallet.gem || 0)}`),
            h('span', { class: 'game-hud__item' }, `${CURRENCIES.ticket.icon} ${formatNumber(wallet.ticket || 0)}`),
            h('span', { class: 'game-hud__item' }, `${CURRENCIES.energy.icon} ${formatNumber(computeCurrentEnergy(data, economy))}/${economy.energy.max}`),
          ]),
          data.isAnonymous
            ? h('button', { class: 'btn btn--primary', style: 'margin-top:var(--space-4)', onClick: async () => {
                try { await signInWithGoogle(); showToast('Đăng nhập thành công!', { type: 'success' }); } catch { showToast('Không thể đăng nhập.', { type: 'error' }); }
              } }, 'Đăng nhập với Google để lưu tiến trình')
            : h('button', { class: 'btn btn--ghost', style: 'margin-top:var(--space-4)', onClick: () => signOutUser() }, 'Đăng xuất'),
        );
      }

      const unsub = subscribeUserDoc(user.uid, renderProfile);
      scope.trackUnsubscribe(unsub);

      const unsubInv = subscribeCollection(`users/${user.uid}/inventory`, (docs) => {
        inventoryCard.replaceChildren(
          h('h3', {}, '🎒 Túi đồ'),
          docs.length
            ? h('ul', { style: 'display:flex;flex-wrap:wrap;gap:var(--space-2);padding:0' }, docs.filter((d) => d.qty > 0).map((d) => h('li', { class: 'badge badge--on' }, `${d.itemId} ×${d.qty}`)))
            : h('p', { class: 'field-hint' }, 'Chưa có vật phẩm nào. Ghé Cửa hàng nhé!'),
        );
      });
      scope.trackUnsubscribe(unsubInv);
    });
  },
  destroy() {},
};
