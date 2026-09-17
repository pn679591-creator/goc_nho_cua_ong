import { h } from '../core/ui.js';
import { resolveAssetUrl, onImageError } from '../core/images.js';
import { createTarotEngine } from '../features/tarot/tarot-state.js';
import { DEFAULT_TAROT_DECK, TAROT_CARD_BACK } from '../features/tarot/deck.js';
import { fetchReading } from '../features/tarot/fallback-texts.js';
import { subscribeCollection, doc, collection, setDoc, getDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from '../core/db.js';
import { db } from '../core/firebase.js';
import { getCurrentUser, onAuthReady } from '../core/auth.js';
import { AI_PROXY_URL } from '../config/app-config.js';

function todayVietnamKey() {
  const now = new Date();
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vn = new Date(now.getTime() + vnOffsetMs - now.getTimezoneOffset() * 60000);
  return vn.toISOString().slice(0, 10);
}

let cssLinkEl = null;
function ensurePageCss() {
  if (cssLinkEl) return;
  cssLinkEl = document.createElement('link');
  cssLinkEl.rel = 'stylesheet';
  cssLinkEl.href = './css/pages/tarot.css?v=1.0.0';
  document.head.append(cssLinkEl);
}
function removePageCss() {
  cssLinkEl?.remove();
  cssLinkEl = null;
}

export default {
  mount(container, { scope }) {
    ensurePageCss();

    let deck = DEFAULT_TAROT_DECK;
    const deckById = () => Object.fromEntries(deck.map((c) => [c.id, c]));

    container.append(h('h1', {}, '🔮 Tarot'));

    const progressEl = h('div', { class: 'tarot-progress' });
    const stage = h('div', { class: 'tarot-page__stage' });
    const stageFrame = h('div', { class: 'frame frame--tarot' });
    stage.append(stageFrame);

    const meaningPanel = h('div', { class: 'tarot-meaning' });

    const drawBtn = h('button', { class: 'btn btn--primary' }, '🔮 Rút một lá');
    const dailyBtn = h('button', { class: 'btn btn--secondary' }, '🌞 Lá bài hôm nay');
    const actions = h('div', { class: 'game-controls' }, [drawBtn, dailyBtn]);

    const historySection = h('section', { class: 'tarot-history' }, [
      h('h2', {}, 'Lịch sử Tarot'),
      h('div', { class: 'tarot-history__grid', id: 'tarot-history-grid' }),
    ]);

    container.append(progressEl, stage, meaningPanel, actions, historySection);

    // ---- Render lá bài: LUÔN dùng replaceChildren, không bao giờ appendChild. ----
    function renderCardFace(currentCard) {
      if (!currentCard) {
        stageFrame.replaceChildren(h('img', { src: resolveAssetUrl(TAROT_CARD_BACK), alt: 'Lá bài úp', width: 240, height: 360 }));
        meaningPanel.replaceChildren();
        return;
      }
      const card = deckById()[currentCard.id];
      if (!card) return;
      const reversed = currentCard.orientation === 'reversed';
      const cardEl = h('div', { class: `tarot-card tarot-card--flipped ${reversed ? 'tarot-card--reversed' : ''}` }, [
        h('div', { class: 'tarot-card__face tarot-card__front' }, [
          h('img', { src: resolveAssetUrl(TAROT_CARD_BACK), alt: '', width: 240, height: 360 }),
        ]),
        h('div', { class: 'tarot-card__face tarot-card__back' }, [
          h('img', { src: resolveAssetUrl(card.image), alt: card.name, width: 240, height: 360 }),
        ]),
      ]);
      stageFrame.replaceChildren(cardEl);

      // Khẳng định (chỉ ở môi trường dev) rằng khu vực kết quả luôn có
      // đúng 1 lá bài và 1 ảnh — đúng yêu cầu "1 lần rút = 1 lá bài".
      const cardCount = stageFrame.querySelectorAll('.tarot-card').length;
      const imgCount = stageFrame.querySelectorAll('.tarot-card img').length;
      if (cardCount !== 1 || imgCount !== 1) {
        console.error(`[tarot] Lỗi hiển thị: có ${cardCount} lá bài, ${imgCount} ảnh trong khu vực kết quả!`);
        stageFrame.replaceChildren(cardEl);
      }

      meaningPanel.replaceChildren(
        h('div', { class: 'tarot-meaning__name' }, card.name),
        h('div', { class: 'tarot-meaning__orientation' }, reversed ? 'Ngược' : 'Xuôi'),
        h('p', { id: 'tarot-reading-text' }, 'Đang luận giải…'),
      );
    }

    const engine = createTarotEngine({
      deck: DEFAULT_TAROT_DECK,
      onChange: (state) => {
        drawBtn.disabled = state.status === 'drawing';
        dailyBtn.disabled = state.status === 'drawing';
        progressEl.textContent = state.status === 'drawing' ? 'Đang rút bài…' : '';
        renderCardFace(state.currentCard);
        if (state.status === 'revealed') {
          loadReadingText(state.currentCard, state.drawToken);
          persistReading(state.currentCard, state.drawToken, 'free');
        }
      },
    });

    async function loadReadingText(currentCard, token) {
      const card = deckById()[currentCard.id];
      const text = await fetchReading({ card, orientation: currentCard.orientation, aiProxyUrl: AI_PROXY_URL });
      // Chặn callback trễ ghi đè lên lượt rút mới hơn.
      if (!engine.isTokenCurrent(token)) return;
      const p = meaningPanel.querySelector('#tarot-reading-text');
      if (p) p.textContent = text;
    }

    async function persistReading(currentCard, token, kind, customDocId) {
      const user = getCurrentUser();
      if (!user) return;
      if (!engine.isTokenCurrent(token)) return;
      try {
        const ref = customDocId ? doc(db, 'tarotReadings', customDocId) : doc(collection(db, 'tarotReadings'));
        await setDoc(ref, {
          uid: user.uid,
          cardId: currentCard.id,
          orientation: currentCard.orientation,
          kind,
          drawnAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('[tarot] không lưu được lượt rút bài', err);
      }
    }

    drawBtn.addEventListener('click', () => engine.drawOneCard());

    dailyBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;
      const dateKey = todayVietnamKey();
      const dailyDocId = `${user.uid}_${dateKey}`;
      dailyBtn.disabled = true;
      try {
        const existing = await getDoc(doc(db, 'tarotReadings', dailyDocId));
        if (existing.exists()) {
          const data = existing.data();
          const shownCard = { id: data.cardId, orientation: data.orientation };
          renderCardFace(shownCard);
          loadReadingText(shownCard, engine.getState().drawToken);
          return;
        }
        const token = engine.drawOneCard();
        // Ghi lại đúng lượt vừa rút với id cố định theo ngày.
        const state = engine.getState();
        if (state.drawToken === token) {
          await persistReading(state.currentCard, token, 'daily', dailyDocId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        dailyBtn.disabled = false;
      }
    });

    // ---- Lịch sử ----
    const historyGrid = historySection.querySelector('#tarot-history-grid');
    function renderHistory(items) {
      if (!items.length) {
        historyGrid.replaceChildren(h('p', { class: 'field-hint' }, 'Chưa có lượt rút bài nào.'));
        return;
      }
      historyGrid.replaceChildren(...items.map((item) => {
        const card = deckById()[item.cardId];
        if (!card) return h('div', {});
        const img = h('img', { src: resolveAssetUrl(card.image), alt: card.name, width: 90, height: 135, loading: 'lazy' });
        onImageError(img);
        return h('div', { class: 'tarot-history__item' }, [img, h('div', {}, card.name)]);
      }));
    }

    onAuthReady(async (user) => {
      if (!user) return;
      try {
        const q = query(collection(db, 'tarotReadings'), where('uid', '==', user.uid), orderBy('drawnAt', 'desc'), limit(24));
        const snap = await getDocs(q);
        renderHistory(snap.docs.map((d) => d.data()));
      } catch (err) {
        renderHistory([]);
      }
    });

    // ---- Bộ bài từ Firestore (registry tarotDeck), có fallback ----
    const unsub = subscribeCollection('tarotDeck', (docs) => {
      if (!docs.length) return;
      const map = new Map(DEFAULT_TAROT_DECK.map((c) => [c.id, c]));
      for (const item of docs) {
        if (item.disabled) { map.delete(item.id); continue; }
        map.set(item.id, { ...map.get(item.id), ...item });
      }
      deck = [...map.values()];
    });
    scope.trackUnsubscribe(unsub);

    renderCardFace(null);
  },
  destroy() {
    removePageCss();
  },
};
