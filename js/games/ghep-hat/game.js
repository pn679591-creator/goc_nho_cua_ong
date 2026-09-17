// Ghép Hạt Ngọt — match-3: đổi chỗ hai hạt liền kề để tạo hàng 3+ cùng loại.
// Xem js/games/san-hat/game.js (tham chiếu) và js/games/README.md để biết
// interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const COLS = 7;
const ROWS = 7;
const BASE_MOVES = 20;
const KINDS = [
  { emoji: '🍬', color: '#ff6b6b' },
  { emoji: '🍭', color: '#ff8fab' },
  { emoji: '🍇', color: '#9d4edd' },
  { emoji: '🍓', color: '#f94144' },
  { emoji: '🍯', color: '#ffb703' },
];
const INVALID_FLASH_SECONDS = 0.28;
const CLEAR_FLASH_SECONDS = 0.35;

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('ghep-hat');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['ghep-hat'] || config || {};

  const movesDelta = cfg.movesDelta?.[difficulty] ?? 0;
  const obstacleDensity = cfg.obstacleDensity?.[difficulty] ?? 0.2;
  const startMoves = Math.max(5, BASE_MOVES + movesDelta);

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let board = [];
  let score = 0;
  let movesLeft = startMoves;
  let elapsed = 0;
  let ended = false;
  let busy = false;

  let selected = null; // {row, col}
  let cursor = { row: 0, col: 0 };
  let dragStart = null; // {row, col, x, y}
  let invalidFlash = null; // {a:{row,col}, b:{row,col}, t}
  let clearFlash = []; // [{row, col, t}]
  let popups = []; // {x, y, text, t}

  let boardX = 0;
  let boardY = 0;
  let tileSize = 40;
  const TOP_BAR = 56;

  function randomKind() {
    return Math.floor(Math.random() * KINDS.length);
  }

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function buildBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let kind;
        let tries = 0;
        do {
          kind = randomKind();
          tries++;
        } while (
          tries < 20 &&
          ((c >= 2 && row[c - 1]?.kind === kind && row[c - 2]?.kind === kind) ||
            (r >= 2 && board[r - 1][c].kind === kind && board[r - 2][c].kind === kind))
        );
        row.push({ type: 'candy', kind });
      }
      board.push(row);
    }
    // Rải chướng ngại vật (ô khoá) làm giảm không gian bàn chơi.
    const holeCount = Math.round(ROWS * COLS * obstacleDensity);
    let placed = 0;
    let guard = 0;
    while (placed < holeCount && guard < holeCount * 20) {
      guard++;
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (board[r][c].type === 'hole') continue;
      board[r][c] = { type: 'hole' };
      placed++;
    }
  }

  function layoutBoard() {
    const availW = dims.width - 24;
    const availH = dims.height - TOP_BAR - 24;
    tileSize = Math.max(20, Math.floor(Math.min(availW / COLS, availH / ROWS)));
    boardX = (dims.width - tileSize * COLS) / 2;
    boardY = TOP_BAR + (dims.height - TOP_BAR - tileSize * ROWS) / 2;
  }
  layoutBoard();
  buildBoard();

  function findMatches() {
    const matched = new Set();
    // Ngang
    for (let r = 0; r < ROWS; r++) {
      let runStart = 0;
      let runKind = null;
      for (let c = 0; c <= COLS; c++) {
        const cell = c < COLS ? board[r][c] : null;
        const kind = cell && cell.type === 'candy' ? cell.kind : null;
        if (kind === null || kind !== runKind) {
          if (runKind !== null && c - runStart >= 3) {
            for (let k = runStart; k < c; k++) matched.add(`${r},${k}`);
          }
          runStart = c;
          runKind = kind;
        }
      }
    }
    // Dọc
    for (let c = 0; c < COLS; c++) {
      let runStart = 0;
      let runKind = null;
      for (let r = 0; r <= ROWS; r++) {
        const cell = r < ROWS ? board[r][c] : null;
        const kind = cell && cell.type === 'candy' ? cell.kind : null;
        if (kind === null || kind !== runKind) {
          if (runKind !== null && r - runStart >= 3) {
            for (let k = runStart; k < r; k++) matched.add(`${k},${c}`);
          }
          runStart = r;
          runKind = kind;
        }
      }
    }
    return matched;
  }

  function collapseColumn(c) {
    const playableRows = [];
    for (let r = 0; r < ROWS; r++) if (board[r][c].type !== 'hole') playableRows.push(r);
    const existing = [];
    for (const r of playableRows) {
      if (board[r][c].type === 'candy') existing.push(board[r][c].kind);
    }
    const missing = playableRows.length - existing.length;
    const finalKinds = [];
    for (let i = 0; i < missing; i++) finalKinds.push(randomKind());
    for (const k of existing) finalKinds.push(k);
    playableRows.forEach((r, i) => {
      board[r][c] = { type: 'candy', kind: finalKinds[i] };
    });
  }

  function resolveMatchesAndCascade() {
    let totalCleared = 0;
    let anyMatch = false;
    let chains = 0;
    for (;;) {
      const matches = findMatches();
      if (matches.size === 0) break;
      anyMatch = true;
      chains++;
      totalCleared += matches.size;
      for (const key of matches) {
        const [r, c] = key.split(',').map(Number);
        clearFlash.push({ row: r, col: c, t: CLEAR_FLASH_SECONDS });
        board[r][c] = { type: 'empty' };
      }
      for (let c = 0; c < COLS; c++) collapseColumn(c);
    }
    return { anyMatch, totalCleared, chains };
  }

  function isAdjacent(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  }

  function attemptSwap(r1, c1, r2, c2) {
    if (busy || ended) return;
    if (!inBounds(r1, c1) || !inBounds(r2, c2)) return;
    if (!isAdjacent({ row: r1, col: c1 }, { row: r2, col: c2 })) return;
    if (board[r1][c1].type !== 'candy' || board[r2][c2].type !== 'candy') return;

    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;

    const { anyMatch, totalCleared, chains } = resolveMatchesAndCascade();
    if (!anyMatch) {
      const back = board[r1][c1];
      board[r1][c1] = board[r2][c2];
      board[r2][c2] = back;
      invalidFlash = { a: { row: r1, col: c1 }, b: { row: r2, col: c2 }, t: INVALID_FLASH_SECONDS };
      audio.play('./assets/audio/hit.mp3', { volume: 0.35 });
      return;
    }
    const gained = totalCleared * 10;
    score += gained;
    movesLeft -= 1;
    const cx = boardX + ((c1 + c2) / 2 + 0.5) * tileSize;
    const cy = boardY + ((r1 + r2) / 2 + 0.5) * tileSize;
    popups.push({ x: cx, y: cy, text: `+${gained}`, t: 0.8 });
    audio.play(chains > 1 ? './assets/audio/powerup.mp3' : './assets/audio/collect.mp3', { volume: 0.5 });
    if (movesLeft <= 0) finish();
  }

  function cellAtCanvasPoint(x, y) {
    const col = Math.floor((x - boardX) / tileSize);
    const row = Math.floor((y - boardY) / tileSize);
    if (!inBounds(row, col)) return null;
    return { row, col };
  }

  function pointerToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (dims.width / rect.width),
      y: (clientY - rect.top) * (dims.height / rect.height),
    };
  }

  function handleTapCell(cell) {
    if (!cell || board[cell.row][cell.col].type !== 'candy') return;
    if (!selected) {
      selected = cell;
      return;
    }
    if (selected.row === cell.row && selected.col === cell.col) {
      selected = null;
      return;
    }
    if (isAdjacent(selected, cell)) {
      attemptSwap(selected.row, selected.col, cell.row, cell.col);
      selected = null;
    } else {
      selected = cell;
    }
  }

  function update(dt) {
    if (ended) return;
    elapsed += dt;
    if (invalidFlash) {
      invalidFlash.t -= dt;
      if (invalidFlash.t <= 0) invalidFlash = null;
    }
    clearFlash = clearFlash.filter((f) => (f.t -= dt) > 0);
    popups = popups.filter((p) => {
      p.t -= dt;
      p.y -= 24 * dt;
      return p.t > 0;
    });
  }

  function drawCell(r, c) {
    const x = boardX + c * tileSize;
    const y = boardY + r * tileSize;
    const cell = board[r][c];
    const pad = 3;

    if (cell.type === 'hole') {
      ctx.fillStyle = '#c9c9c9';
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, 8);
      ctx.fill();
      ctx.font = `${Math.floor(tileSize * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', x + tileSize / 2, y + tileSize / 2);
      return;
    }
    if (cell.type !== 'candy') return;

    const k = KINDS[cell.kind];
    const isSelected = selected && selected.row === r && selected.col === c;
    const isCursor = cursor.row === r && cursor.col === c;
    const flash = clearFlash.find((f) => f.row === r && f.col === c);

    ctx.fillStyle = flash ? '#fff3b0' : k.color + '33';
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, 10);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, 10);
      ctx.stroke();
    } else if (isCursor) {
      ctx.strokeStyle = '#6b4226';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + pad + 1, y + pad + 1, tileSize - pad * 2 - 2, tileSize - pad * 2 - 2, 9);
      ctx.stroke();
    }

    ctx.font = `${Math.floor(tileSize * 0.56)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(k.emoji, x + tileSize / 2, y + tileSize / 2 + 1);

    if (invalidFlash) {
      const isA = invalidFlash.a.row === r && invalidFlash.a.col === c;
      const isB = invalidFlash.b.row === r && invalidFlash.b.col === c;
      if (isA || isB) {
        ctx.strokeStyle = 'rgba(217,4,41,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, 10);
        ctx.stroke();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#fff1e6';
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.fillStyle = '#6b4226';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`⭐ Điểm: ${score}`, 16, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`🎯 Lượt: ${Math.max(0, movesLeft)}`, dims.width - 16, 30);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) drawCell(r, c);
    }

    ctx.fillStyle = '#d94a1c';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.t));
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function computeStars() {
    if (score >= 500) return 3;
    if (score >= 260) return 2;
    if (score >= 100) return 1;
    return 0;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    onEnd({ score, stars: computeStars(), durationMs: Math.round(elapsed * 1000) });
  }

  function moveCursor(dr, dc) {
    cursor = {
      row: Math.max(0, Math.min(ROWS - 1, cursor.row + dr)),
      col: Math.max(0, Math.min(COLS - 1, cursor.col + dc)),
    };
  }

  scope.on(window, 'keydown', (e) => {
    if (ended) return;
    const dirs = {
      ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
      ArrowRight: [0, 1], d: [0, 1], D: [0, 1],
      ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
      ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
    };
    const dir = dirs[e.key];
    if (dir) {
      e.preventDefault();
      if (selected) {
        const target = { row: selected.row + dir[0], col: selected.col + dir[1] };
        attemptSwap(selected.row, selected.col, target.row, target.col);
        selected = null;
      } else {
        moveCursor(dir[0], dir[1]);
      }
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleTapCell({ row: cursor.row, col: cursor.col });
    }
  });

  scope.on(canvas, 'pointerdown', (e) => {
    if (ended) return;
    const pt = pointerToCanvas(e.clientX, e.clientY);
    const cell = cellAtCanvasPoint(pt.x, pt.y);
    if (!cell) return;
    dragStart = { row: cell.row, col: cell.col, x: e.clientX, y: e.clientY };
    cursor = { row: cell.row, col: cell.col };
  });

  scope.on(window, 'pointerup', (e) => {
    if (!dragStart || ended) { dragStart = null; return; }
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const dist = Math.hypot(dx, dy);
    const threshold = 18;
    if (dist > threshold) {
      let dr = 0;
      let dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
      else dr = dy > 0 ? 1 : -1;
      attemptSwap(dragStart.row, dragStart.col, dragStart.row + dr, dragStart.col + dc);
      selected = null;
    } else {
      handleTapCell({ row: dragStart.row, col: dragStart.col });
    }
    dragStart = null;
  });

  const onResize = () => {
    dims = fitCanvasToContainer(canvas, canvas.parentElement);
    layoutBoard();
  };
  scope.on(window, 'resize', onResize);

  return {
    start() { loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      score = 0;
      movesLeft = startMoves;
      elapsed = 0;
      ended = false;
      busy = false;
      selected = null;
      cursor = { row: 0, col: 0 };
      dragStart = null;
      invalidFlash = null;
      clearFlash = [];
      popups = [];
      layoutBoard();
      buildBoard();
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
