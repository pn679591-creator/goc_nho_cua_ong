import { h, formatNumber } from '../core/ui.js';
import { resolveAssetUrl, onImageError } from '../core/images.js';
import { DEFAULT_CROPS, FARM_PLOT_COUNT } from '../features/farm/default-crops.js';
import { subscribeCollection, doc, getDoc, setDoc, runTransaction, serverTimestamp, increment, onSnapshot } from '../core/db.js';
import { db } from '../core/firebase.js';
import { getCurrentUser, onAuthReady } from '../core/auth.js';
import { openModal } from '../core/dialog.js';
import { showToast } from '../core/toast.js';

let cssLinkEl = null;
function ensurePageCss() {
  cssLinkEl = document.createElement('link');
  cssLinkEl.rel = 'stylesheet';
  cssLinkEl.href = './css/pages/farm.css?v=1.0.0';
  document.head.append(cssLinkEl);
}

function emptyPlots() {
  return Array.from({ length: FARM_PLOT_COUNT }, () => ({ cropId: null, plantedAt: null }));
}

export default {
  mount(container, { scope }) {
    ensurePageCss();
    container.append(h('h1', {}, '🌱 Nông trại'));
    const hint = h('p', { class: 'field-hint' }, 'Chạm vào ô đất trống để trồng, chạm vào cây chín để thu hoạch.');
    const grid = h('div', { class: 'farm-grid' });
    container.append(hint, grid);

    let crops = DEFAULT_CROPS;
    const cropsById = () => Object.fromEntries(crops.map((c) => [c.id, c]));

    scope.trackUnsubscribe(subscribeCollection('crops', (docs) => {
      if (!docs.length) return;
      const map = new Map(DEFAULT_CROPS.map((c) => [c.id, c]));
      for (const item of docs) {
        if (item.disabled) { map.delete(item.id); continue; }
        map.set(item.id, { ...map.get(item.id), ...item });
      }
      crops = [...map.values()];
      render();
    }));

    let plots = emptyPlots();
    let farmRef = null;

    function render() {
      const now = Date.now();
      grid.replaceChildren(...plots.map((plot, index) => {
        if (!plot.cropId) {
          return h('button', { class: 'farm-plot', onClick: () => openPicker(index) }, [
            h('img', { class: 'farm-plot__bg', src: resolveAssetUrl('crops/empty-plot.svg'), alt: 'Ô đất trống', width: 120, height: 120 }),
            h('span', { class: 'farm-plot__ready' }, '➕'),
          ]);
        }
        const crop = cropsById()[plot.cropId];
        if (!crop) return h('div', { class: 'farm-plot' });
        const plantedMs = plot.plantedAt?.toMillis ? plot.plantedAt.toMillis() : null;
        const growMs = crop.growSeconds * 1000;
        const progress = plantedMs ? Math.min(1, (now - plantedMs) / growMs) : 0;
        const ready = plantedMs && progress >= 1;
        const img = h('img', { class: 'farm-plot__crop', src: resolveAssetUrl(crop.image), alt: crop.name, width: 96, height: 96 });
        onImageError(img);
        return h('button', {
          class: 'farm-plot',
          onClick: () => (ready ? harvest(index) : null),
          title: ready ? `Thu hoạch ${crop.name}` : `${crop.name} đang lớn…`,
        }, [
          h('img', { class: 'farm-plot__bg', src: resolveAssetUrl('crops/empty-plot.svg'), alt: '', width: 120, height: 120 }),
          img,
          !ready ? h('div', { class: 'farm-plot__bar bar' }, [h('div', { class: 'bar__fill', style: `width:${Math.round(progress * 100)}%` })]) : null,
          ready ? h('span', { class: 'farm-plot__ready' }, '✨') : null,
        ]);
      }));
    }

    function openPicker(index) {
      const list = h('div', { class: 'crop-picker' }, crops.map((crop) => {
        const img = h('img', { src: resolveAssetUrl(crop.image), alt: crop.name, width: 56, height: 56 });
        onImageError(img);
        return h('button', { class: 'crop-picker__item', onClick: () => { plant(index, crop.id); close(); } }, [
          img, h('span', {}, crop.name), h('span', { class: 'field-hint' }, `${crop.growSeconds}s`),
        ]);
      }));
      const close = openModal(h('div', {}, [h('h3', {}, 'Chọn cây để trồng'), list]));
    }

    async function plant(index, cropId) {
      if (!farmRef) return;
      const nextPlots = plots.map((p, i) => (i === index ? { cropId, plantedAt: serverTimestamp() } : p));
      try {
        await setDoc(farmRef, { plots: nextPlots }, { merge: true });
      } catch (err) {
        console.error(err);
        showToast('Không thể trồng cây lúc này.', { type: 'error' });
      }
    }

    async function harvest(index) {
      const user = getCurrentUser();
      if (!user || !farmRef) return;
      const crop = cropsById()[plots[index].cropId];
      if (!crop) return;
      const userRef = doc(db, 'users', user.uid);
      try {
        await runTransaction(db, async (tx) => {
          const farmSnap = await tx.get(farmRef);
          const data = farmSnap.data();
          const target = data.plots[index];
          const plantedMs = target?.plantedAt?.toMillis ? target.plantedAt.toMillis() : 0;
          if (!plantedMs || Date.now() - plantedMs < crop.growSeconds * 1000) {
            throw new Error('Cây chưa chín, chờ thêm chút nhé.');
          }
          const nextPlots = [...data.plots];
          nextPlots[index] = { cropId: null, plantedAt: null };
          tx.set(farmRef, { plots: nextPlots }, { merge: true });
          tx.set(userRef, { wallet: { coin: increment(crop.sellPrice) }, exp: increment(crop.exp) }, { merge: true });
        });
        showToast(`+${formatNumber(crop.sellPrice)} 🌻 · +${formatNumber(crop.exp)} EXP`, { type: 'success' });
      } catch (err) {
        showToast(err.message || 'Không thể thu hoạch lúc này.', { type: 'error' });
      }
    }

    onAuthReady(async (user) => {
      if (!user) return;
      farmRef = doc(db, 'farms', user.uid);
      const snap = await getDoc(farmRef);
      if (!snap.exists()) {
        plots = emptyPlots();
        await setDoc(farmRef, { plots, createdAt: serverTimestamp() });
      } else {
        plots = snap.data().plots || emptyPlots();
      }
      render();

      const timer = scope.setInterval(render, 1000);
      scope.trackUnsubscribe(() => scope.clearInterval(timer));

      const unsub = onSnapshot(farmRef, (s) => {
        if (s.exists()) { plots = s.data().plots || emptyPlots(); render(); }
      });
      scope.trackUnsubscribe(unsub);
    });

    render();
  },
  destroy() {
    cssLinkEl?.remove();
    cssLinkEl = null;
  },
};
