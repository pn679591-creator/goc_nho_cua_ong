// Lật Thẻ Ghép Đôi — memory match lưới NxN theo độ khó. Người chơi lật 2 thẻ
// mỗi lượt, tìm cặp trùng emoji. Sai 2 lần liên tiếp (ở Khó) sẽ xáo lại vị trí
// các thẻ chưa ghép được. Xem js/games/san-hat/game.js (tham chiếu) và
// js/games/README.md để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const EMOJI_POOL = [
  '🍎', '🍓', '🍇', '🍊', '🍉', '🍒', '🍋', '🥕',
  '🌻', '🌼', '🐝', '🐛', '🦋', '🐞', '🐿️', '🦔',
  '🌰', '🍄',
];
const CARD_GAP = 10;
const PEEK_MS = 700;
const MISMATCH_MS = 800;

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('lat-the');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['lat-the'] || config || {};

  const grid = cfg.grid?.[difficulty] || [4, 4];
  const cols = grid[0] || 4;
  const rows = grid[1] || 4;
  const timeLimitSeconds = cfg.timeLimitSeconds?.[difficulty] ?? 0;
  const shuffleOnMismatch = cfg.shuffleOnMismatch?.[difficulty] ?? false;

  const totalCards = cols * rows;
  const totalPairs = Math.floor(totalCards / 2);

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let cards = [];
  let flippedIds = [];
  let matchedCount = 0;
  let mismatchCount = 0;
  let mismatchStreak = 0;
  let score = 0;
  let timeLeft = timeLimitSeconds;
  let elapsed = 0;
  let ended = false;
  let inputLocked = false;
  let cursorRow = 0;
  let cursorCol = 0;

  function buildCards() {
    const pairKeys = [];
    for (let i = 0; i < totalPairs; i++) pairKeys.push(EMOJI_POOL[i % EMOJI_POOL.length] + (i >= EMOJI_POOL.length ? `#${i}` : ''));
    let values = [...pairKeys, ...pairKeys];
    // Nếu số ô lẻ (không xảy ra bình thường), bỏ 1 ô dư.
    values = values.slice(0, totalCards);
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    const next = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        next.push({
          id: idx,
          value: values[idx] ?? `x${idx}`,
          row: r,
          col: c,
          flipped: false,
          matched: false,
        });
        idx += 1;
      }
    }
    return next;
  }

  function resetGame() {
    cards = buildCards();
    flippedIds = [];
    matchedCount = 0;
    mismatchCount = 0;
    mismatchStreak = 0;
    score = 0;
    timeLeft = timeLimitSeconds;
    elapsed = 0;
    ended = false;
    inputLocked = false;
    cursorRow = 0;
    cursorCol = 0;
  }
  resetGame();

  function layout() {
    const paddingTop = 56;
    const paddingSide = 16;
    const boardW = dims.width - paddingSide * 2;
    const boardH = dims.height - paddingTop - 16;
    const cardW = (boardW - CARD_GAP * (cols - 1)) / cols;
    const cardH = (boardH - CARD_GAP * (rows - 1)) / rows;
    return { paddingTop, paddingSide, cardW, cardH };
  }

  function cardRect(card) {
    const { paddingTop, paddingSide, cardW, cardH } = layout();
    return {
      x: paddingSide + card.col * (cardW + CARD_GAP),
      y: paddingTop + card.row * (cardH + CARD_GAP),
      w: cardW,
      h: cardH,
    };
  }

  function cardAtPoint(px, py) {
    for (const card of cards) {
      if (card.matched) continue;
      const rect = cardRect(card);
      if (px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h) return card;
    }
    return null;
  }

  function shuffleUnmatched() {
    const positions = cards.filter((c) => !c.matched).map((c) => ({ row: c.row, col: c.col }));
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    let i = 0;
    for (const card of cards) {
      if (card.matched) continue;
      card.row = positions[i].row;
      card.col = positions[i].col;
      i += 1;
    }
  }

  function computeStars() {
    const maxScore = totalPairs * 30;
    if (matchedCount < totalPairs) return 0;
    const ratio = maxScore > 0 ? score / maxScore : 0;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    onEnd({ score: Math.max(0, Math.round(score)), stars: computeStars(), durationMs: elapsed * 1000 });
  }

  function flipCard(card) {
    if (ended || inputLocked || card.matched || card.flipped) return;
    if (flippedIds.length >= 2) return;
    card.flipped = true;
    flippedIds.push(card.id);
    audio.play('./assets/audio/flip.mp3', { volume: 0.4 });
    if (flippedIds.length === 2) {
      inputLocked = true;
      const [a, b] = flippedIds.map((id) => cards.find((c) => c.id === id));
      if (a.value === b.value) {
        scope.setTimeout(() => {
          a.matched = true;
          b.matched = true;
          matchedCount += 1;
          score += 30;
          flippedIds = [];
          inputLocked = false;
          audio.play('./assets/audio/collect.mp3', { volume: 0.5 });
          if (matchedCount >= totalPairs) finish();
        }, PEEK_MS);
      } else {
        scope.setTimeout(() => {
          mismatchCount += 1;
          mismatchStreak += 1;
          a.flipped = false;
          b.flipped = false;
          flippedIds = [];
          score = Math.max(0, score - 3);
          if (shuffleOnMismatch && mismatchStreak >= 2) {
            mismatchStreak = 0;
            shuffleUnmatched();
          }
          inputLocked = false;
        }, MISMATCH_MS);
      }
    }
  }

  function update(dt) {
    if (ended) return;
    elapsed += dt;
    if (timeLimitSeconds > 0) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finish(); }
    }
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#fef6ff';
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#3a2d4a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`⭐ ${Math.max(0, Math.round(score))}`, 16, 28);
    ctx.textAlign = 'right';
    ctx.fillText(`🃏 ${matchedCount}/${totalPairs}`, dims.width - 16, 28);
    if (timeLimitSeconds > 0) {
      ctx.textAlign = 'center';
      ctx.fillText(`⏱️ ${Math.ceil(timeLeft)}s`, dims.width / 2, 28);
    }

    for (const card of cards) {
      const rect = cardRect(card);
      const isCursor = card.row === cursorRow && card.col === cursorCol;
      if (card.matched) {
        ctx.fillStyle = '#d7f5df';
      } else if (card.flipped) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#c9a0dc';
      }
      drawRoundedRect(rect.x, rect.y, rect.w, rect.h, 12);
      ctx.fill();
      if (isCursor && !card.matched) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#5b3a70';
        drawRoundedRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3, 11);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      if (card.flipped || card.matched) {
        ctx.font = `${Math.min(rect.w, rect.h) * 0.55}px sans-serif`;
        ctx.fillStyle = '#2d2036';
        ctx.fillText(card.value.slice(0, 2), cx, cy);
      } else {
        ctx.font = `bold ${Math.min(rect.w, rect.h) * 0.4}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('?', cx, cy);
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function moveCursor(dr, dc) {
    cursorRow = Math.max(0, Math.min(rows - 1, cursorRow + dr));
    cursorCol = Math.max(0, Math.min(cols - 1, cursorCol + dc));
  }

  scope.on(window, 'keydown', (e) => {
    if (ended) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') moveCursor(0, -1);
    else if (e.key === 'ArrowRight' || e.key === 'd') moveCursor(0, 1);
    else if (e.key === 'ArrowUp' || e.key === 'w') moveCursor(-1, 0);
    else if (e.key === 'ArrowDown' || e.key === 's') moveCursor(1, 0);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const card = cards.find((c) => c.row === cursorRow && c.col === cursorCol);
      if (card) flipCard(card);
    }
  });

  function pointerToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (dims.width / rect.width),
      y: (clientY - rect.top) * (dims.height / rect.height),
    };
  }
  scope.on(canvas, 'pointerdown', (e) => {
    const { x, y } = pointerToCanvas(e.clientX, e.clientY);
    const card = cardAtPoint(x, y);
    if (card) {
      cursorRow = card.row;
      cursorCol = card.col;
      flipCard(card);
    }
  });

  const onResize = () => { dims = fitCanvasToContainer(canvas, canvas.parentElement); };
  scope.on(window, 'resize', onResize);

  return {
    start() { loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      resetGame();
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
