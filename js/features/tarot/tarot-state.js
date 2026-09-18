// Máy trạng thái Tarot — QUY TẮC CUỐI CÙNG: 1 lần rút = 1 lá bài.
// Đây là module LOGIC THUẦN, không đụng vào DOM, để đảm bảo không có nơi
// nào khác trong app có thể vô tình sinh ra 2 lá bài cùng lúc.
//
// state luôn có dạng { status, currentCard, drawToken } — currentCard là
// MỘT object hoặc null, KHÔNG BAO GIỜ là mảng.
export function createTarotEngine({ deck, pickRandom = defaultPick, onChange }) {
  let state = { status: 'idle', currentCard: null, drawToken: 0 };

  function emit() {
    onChange?.(state);
  }

  function getState() {
    return state;
  }

  /** Hàm DUY NHẤT được phép chọn bài. Nếu đang rút dở thì bỏ qua ngay. */
  function drawOneCard({ orientationRandom = true } = {}) {
    if (state.status === 'drawing') return state.drawToken;
    const token = state.drawToken + 1;
    state = { status: 'drawing', currentCard: null, drawToken: token };
    emit();

    const card = pickRandom(deck);
    const orientation = orientationRandom && Math.random() < 0.5 ? 'reversed' : 'upright';

    // "reveal" xảy ra ngay lập tức ở tầng logic; phần hoạt ảnh lật bài do
    // UI tự xử lý và phải tự kiểm tra token trước khi vẽ lại DOM.
    state = {
      status: 'revealed',
      currentCard: { id: card.id, orientation, drawnAt: Date.now() },
      drawToken: token,
    };
    emit();
    return token;
  }

  function reset() {
    state = { status: 'idle', currentCard: null, drawToken: state.drawToken };
    emit();
  }

  function isTokenCurrent(token) {
    return token === state.drawToken;
  }

  return { getState, drawOneCard, reset, isTokenCurrent };
}

function defaultPick(deck) {
  const idx = Math.floor(Math.random() * deck.length);
  return deck[idx];
}
