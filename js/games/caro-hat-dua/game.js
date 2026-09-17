// Caro Hạt Dưa — Gomoku/五子棋 9x9, cần 5 quân liên tiếp để thắng, đấu với AI
// (heuristic + minimax alpha-beta nông, giới hạn nước đi xung quanh quân đã
// đặt để giữ tốc độ tính toán). Xem js/games/san-hat/game.js (tham chiếu) và
// js/games/README.md để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const EMPTY = 0;
const PLAYER = 1;
const AI = 2;
const PLAYER_EMOJI = '🍉';
const AI_EMOJI = '🌻';
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const TOP_BAR_HEIGHT = 48;
const AI_THINK_DELAY_MS = 450;

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('caro-hat-dua');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['caro-hat-dua'] || config || {};

  const boardSize = cfg.boardSize || 9;
  const winLength = cfg.winLength || 5;
  const aiSearchPly = cfg.aiSearchPly?.[difficulty] ?? 1;
  const aiBlockThreatChance = cfg.aiBlockThreatChance?.[difficulty] ?? 1;
  const aiOpenFourDetection = cfg.aiOpenFourDetection?.[difficulty] ?? false;
  const moveTimerSeconds = cfg.moveTimerSeconds?.[difficulty] ?? 30;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let board = [];
  let turn = 'player'; // 'player' | 'ai' | 'over'
  let ended = false;
  let timeLeft = moveTimerSeconds;
  let elapsedTime = 0;
  let cursorR = Math.floor(boardSize / 2);
  let cursorC = Math.floor(boardSize / 2);
  let statusText = 'Lượt của bạn';
  let lastMove = null;
  let aiThinking = false;

  function inBounds(r, c) {
    return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
  }

  function resetBoard() {
    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(EMPTY));
  }
  resetBoard();

  function checkWinAt(r, c, player) {
    for (const [dr, dc] of DIRECTIONS) {
      let count = 1;
      let rr = r + dr, cc = c + dc;
      while (inBounds(rr, cc) && board[rr][cc] === player) { count++; rr += dr; cc += dc; }
      rr = r - dr; cc = c - dc;
      while (inBounds(rr, cc) && board[rr][cc] === player) { count++; rr -= dr; cc -= dc; }
      if (count >= winLength) return true;
    }
    return false;
  }

  function isBoardFull() {
    for (let r = 0; r < boardSize; r++) for (let c = 0; c < boardSize; c++) if (board[r][c] === EMPTY) return false;
    return true;
  }

  function getCandidates(radius = 2) {
    const set = new Set();
    let hasStone = false;
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === EMPTY) continue;
        hasStone = true;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const rr = r + dr, cc = c + dc;
            if (inBounds(rr, cc) && board[rr][cc] === EMPTY) set.add(rr * boardSize + cc);
          }
        }
      }
    }
    if (!hasStone) {
      const mid = Math.floor(boardSize / 2);
      return [{ r: mid, c: mid }];
    }
    return [...set].map((v) => ({ r: Math.floor(v / boardSize), c: v % boardSize }));
  }

  function patternScore(len, openEnds) {
    if (len >= winLength) return 1000000;
    if (len === winLength - 1) return openEnds === 2 ? 100000 : openEnds === 1 ? 8000 : 0;
    if (len === winLength - 2) return openEnds === 2 ? 4000 : openEnds === 1 ? 400 : 0;
    if (len === winLength - 3) return openEnds === 2 ? 200 : openEnds === 1 ? 40 : 0;
    if (len >= 1) return openEnds === 2 ? 10 : openEnds === 1 ? 4 : 0;
    return 0;
  }

  function scorePlayerOnBoard(b, player) {
    let total = 0;
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (b[r][c] !== player) continue;
        for (const [dr, dc] of DIRECTIONS) {
          const pr = r - dr, pc = c - dc;
          if (inBounds(pr, pc) && b[pr][pc] === player) continue; // không phải điểm bắt đầu chuỗi
          let len = 0, rr = r, cc = c;
          while (inBounds(rr, cc) && b[rr][cc] === player) { len++; rr += dr; cc += dc; }
          const openStart = inBounds(pr, pc) && b[pr][pc] === EMPTY;
          const openEnd = inBounds(rr, cc) && b[rr][cc] === EMPTY;
          total += patternScore(len, (openStart ? 1 : 0) + (openEnd ? 1 : 0));
        }
      }
    }
    return total;
  }

  function evaluateBoard(b) {
    return scorePlayerOnBoard(b, AI) - scorePlayerOnBoard(b, PLAYER) * 1.1;
  }

  function findWinningMove(candidates, player) {
    for (const { r, c } of candidates) {
      board[r][c] = player;
      const win = checkWinAt(r, c, player);
      board[r][c] = EMPTY;
      if (win) return { r, c };
    }
    return null;
  }

  // Đếm số "mối đe doạ mạnh" (chuỗi mở-3 hoặc 4) mà nước đi tại (r,c) tạo ra
  // cho player — dùng để phát hiện thế "tứ mở"/"song tam" (open four / double
  // open-three) và chặn trước ở độ Khó.
  function countStrongThreatsAt(r, c, player) {
    let strong = 0;
    board[r][c] = player;
    for (const [dr, dc] of DIRECTIONS) {
      let br = r, bc = c;
      while (inBounds(br - dr, bc - dc) && board[br - dr][bc - dc] === player) { br -= dr; bc -= dc; }
      let len = 0, rr = br, cc = bc;
      while (inBounds(rr, cc) && board[rr][cc] === player) { len++; rr += dr; cc += dc; }
      const openStart = inBounds(br - dr, bc - dc) && board[br - dr][bc - dc] === EMPTY;
      const openEnd = inBounds(rr, cc) && board[rr][cc] === EMPTY;
      const openEnds = (openStart ? 1 : 0) + (openEnd ? 1 : 0);
      if (len >= winLength - 1 && openEnds >= 1) strong++;
      else if (len === winLength - 2 && openEnds === 2) strong++;
    }
    board[r][c] = EMPTY;
    return strong;
  }

  function findDoubleThreatBlock(candidates, opponent) {
    for (const { r, c } of candidates) {
      if (countStrongThreatsAt(r, c, opponent) >= 2) return { r, c };
    }
    return null;
  }

  function bestGreedyMove(candidates) {
    let best = null, bestScore = -Infinity;
    for (const { r, c } of candidates) {
      board[r][c] = AI;
      const s = evaluateBoard(board);
      board[r][c] = EMPTY;
      const jitter = Math.random() * 0.01;
      if (s + jitter > bestScore) { bestScore = s + jitter; best = { r, c }; }
    }
    return best;
  }

  function rankCandidates(candidates, player) {
    return candidates
      .map((mv) => {
        board[mv.r][mv.c] = player;
        const s = evaluateBoard(board);
        board[mv.r][mv.c] = EMPTY;
        return { ...mv, s: player === AI ? s : -s };
      })
      .sort((a, b) => b.s - a.s);
  }

  function minimax(depth, alpha, beta, maximizing) {
    if (depth === 0) return evaluateBoard(board);
    const player = maximizing ? AI : PLAYER;
    const candidates = rankCandidates(getCandidates(2), player).slice(0, 8);
    if (candidates.length === 0) return evaluateBoard(board);
    if (maximizing) {
      let value = -Infinity;
      for (const { r, c } of candidates) {
        board[r][c] = AI;
        if (checkWinAt(r, c, AI)) { board[r][c] = EMPTY; return 1000000; }
        value = Math.max(value, minimax(depth - 1, alpha, beta, false));
        board[r][c] = EMPTY;
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    }
    let value = Infinity;
    for (const { r, c } of candidates) {
      board[r][c] = PLAYER;
      if (checkWinAt(r, c, PLAYER)) { board[r][c] = EMPTY; return -1000000; }
      value = Math.min(value, minimax(depth - 1, alpha, beta, true));
      board[r][c] = EMPTY;
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  function minimaxRoot(candidates, depth) {
    let best = null, bestScore = -Infinity;
    let alpha = -Infinity, beta = Infinity;
    const ranked = rankCandidates(candidates, AI).slice(0, 8);
    for (const { r, c } of ranked) {
      board[r][c] = AI;
      const score = checkWinAt(r, c, AI) ? 1000000 : minimax(depth - 1, alpha, beta, false);
      board[r][c] = EMPTY;
      const jitter = Math.random() * 0.01;
      if (score + jitter > bestScore) { bestScore = score + jitter; best = { r, c }; }
      alpha = Math.max(alpha, bestScore);
    }
    return best;
  }

  function chooseAiMove() {
    const candidates = getCandidates(2);
    if (candidates.length === 0) return { r: Math.floor(boardSize / 2), c: Math.floor(boardSize / 2) };

    const winMove = findWinningMove(candidates, AI);
    if (winMove) return winMove;

    const blockMove = findWinningMove(candidates, PLAYER);
    if (blockMove && Math.random() < aiBlockThreatChance) return blockMove;

    if (aiOpenFourDetection) {
      const critical = findDoubleThreatBlock(candidates, PLAYER);
      if (critical) return critical;
    }

    if (aiSearchPly <= 1) return bestGreedyMove(candidates);
    return minimaxRoot(candidates, aiSearchPly) || bestGreedyMove(candidates);
  }

  function computeStars(result) {
    if (result === 'win') return 3;
    if (result === 'draw') return 1;
    return 0;
  }

  function finish(result) {
    if (ended) return;
    ended = true;
    turn = 'over';
    loop.stop();
    const score = result === 'win' ? 100 : result === 'draw' ? 40 : 10;
    statusText = result === 'win' ? '🎉 Bạn thắng!' : result === 'draw' ? '🤝 Hoà!' : 'Bạn đã thua';
    audio.play(result === 'win' ? './assets/audio/win.mp3' : './assets/audio/lose.mp3', { volume: 0.5 });
    onEnd({ score, stars: computeStars(result), durationMs: Math.round(elapsedTime * 1000) });
  }

  function placePlayerMove(r, c) {
    if (ended || turn !== 'player' || !inBounds(r, c) || board[r][c] !== EMPTY) return;
    board[r][c] = PLAYER;
    lastMove = { r, c };
    audio.play('./assets/audio/place.mp3', { volume: 0.4 });
    if (checkWinAt(r, c, PLAYER)) { finish('win'); return; }
    if (isBoardFull()) { finish('draw'); return; }
    turn = 'ai';
    aiThinking = true;
    statusText = 'AI đang suy nghĩ…';
    scope.setTimeout(() => {
      if (ended) return;
      const mv = chooseAiMove();
      aiThinking = false;
      if (!mv) { finish('draw'); return; }
      board[mv.r][mv.c] = AI;
      lastMove = mv;
      audio.play('./assets/audio/place.mp3', { volume: 0.4 });
      if (checkWinAt(mv.r, mv.c, AI)) { finish('loss'); return; }
      if (isBoardFull()) { finish('draw'); return; }
      turn = 'player';
      timeLeft = moveTimerSeconds;
      statusText = 'Lượt của bạn';
    }, AI_THINK_DELAY_MS);
  }

  function update(dt) {
    if (ended) return;
    elapsedTime += dt;
    if (turn === 'player') {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish('loss'); }
    }
  }

  function boardMetrics() {
    const top = TOP_BAR_HEIGHT;
    const avail = Math.min(dims.width, dims.height - top);
    const cell = avail / boardSize;
    const originX = (dims.width - cell * boardSize) / 2;
    const originY = top + (dims.height - top - cell * boardSize) / 2;
    return { cell, originX, originY };
  }

  function cellFromPoint(x, y) {
    const { cell, originX, originY } = boardMetrics();
    const c = Math.floor((x - originX) / cell);
    const r = Math.floor((y - originY) / cell);
    if (!inBounds(r, c)) return null;
    return { r, c };
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.fillStyle = '#6b4226';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, 12, TOP_BAR_HEIGHT / 2);
    ctx.textAlign = 'right';
    const timerColor = turn === 'player' && timeLeft <= 5 ? '#e63946' : '#6b4226';
    ctx.fillStyle = timerColor;
    ctx.fillText(turn === 'player' && !ended ? `⏱️ ${Math.max(0, Math.ceil(timeLeft))}s` : '', dims.width - 12, TOP_BAR_HEIGHT / 2);

    const { cell, originX, originY } = boardMetrics();
    ctx.strokeStyle = '#d8b26b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= boardSize; i++) {
      ctx.beginPath();
      ctx.moveTo(originX + i * cell, originY);
      ctx.lineTo(originX + i * cell, originY + boardSize * cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(originX, originY + i * cell);
      ctx.lineTo(originX + boardSize * cell, originY + i * cell);
      ctx.stroke();
    }

    if (lastMove) {
      ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
      ctx.fillRect(originX + lastMove.c * cell, originY + lastMove.r * cell, cell, cell);
    }

    if (turn === 'player' && !ended) {
      ctx.strokeStyle = '#fb8500';
      ctx.lineWidth = 2;
      ctx.strokeRect(originX + cursorC * cell + 1, originY + cursorR * cell + 1, cell - 2, cell - 2);
    }

    ctx.font = `${Math.floor(cell * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const v = board[r][c];
        if (v === EMPTY) continue;
        ctx.fillText(v === PLAYER ? PLAYER_EMOJI : AI_EMOJI, originX + c * cell + cell / 2, originY + r * cell + cell / 2 + 1);
      }
    }
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function pointerToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) * (dims.width / rect.width), y: (clientY - rect.top) * (dims.height / rect.height) };
  }

  scope.on(canvas, 'pointerdown', (e) => {
    if (turn !== 'player' || ended) return;
    const { x, y } = pointerToCanvas(e.clientX, e.clientY);
    const cell = cellFromPoint(x, y);
    if (!cell) return;
    cursorR = cell.r; cursorC = cell.c;
    placePlayerMove(cell.r, cell.c);
  });

  scope.on(window, 'keydown', (e) => {
    if (ended) return;
    if (e.key === 'ArrowUp') { cursorR = Math.max(0, cursorR - 1); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { cursorR = Math.min(boardSize - 1, cursorR + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { cursorC = Math.max(0, cursorC - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { cursorC = Math.min(boardSize - 1, cursorC + 1); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (turn === 'player') placePlayerMove(cursorR, cursorC);
    }
  });

  const onResize = () => { dims = fitCanvasToContainer(canvas, canvas.parentElement); };
  scope.on(window, 'resize', onResize);

  return {
    start() { loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      resetBoard();
      turn = 'player';
      ended = false;
      timeLeft = moveTimerSeconds;
      elapsedTime = 0;
      lastMove = null;
      aiThinking = false;
      statusText = 'Lượt của bạn';
      cursorR = Math.floor(boardSize / 2);
      cursorC = Math.floor(boardSize / 2);
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
