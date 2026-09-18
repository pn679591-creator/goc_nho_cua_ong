// Đập Sâu Vườn — sâu bọ xuất hiện ngẫu nhiên ở các hố trong vườn, người chơi
// chạm/click để đập trước khi sâu chui xuống. Thỉnh thoảng một chú hamster
// con ló lên — TUYỆT ĐỐI không được đập trúng. Xem js/games/san-hat/game.js
// (tham chiếu) và js/games/README.md để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const GRID_COLS = 3;
const GRID_ROWS = 3;
const HOLE_COUNT = GRID_COLS * GRID_ROWS;
const HOLE_RADIUS = 40;
const BUG_EMOJIS = ['🐛', '🦗', '🐌'];
const BABY_HAMSTER_EMOJI = '🐹';
const MIN_SPAWN_GAP = 0.15;
const MAX_SPAWN_GAP = 0.45;

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('dap-sau');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['dap-sau'] || config || {};

  const bugVisibleSeconds = cfg.bugVisibleSeconds?.[difficulty] ?? 0.8;
  const babyHamsterChance = cfg.babyHamsterChance?.[difficulty] ?? 0.1;
  const roundSeconds = cfg.roundSeconds ?? 60;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let score = 0;
  let hits = 0;
  let misses = 0;
  let timeLeft = roundSeconds;
  let elapsed = 0;
  let ended = false;
  let active = null; // { holeIndex, isBaby, timeLeft, emoji, hitFx }
  let spawnTimer = 0.5;
  let cursorIndex = 0;
  let hitFlashes = [];

  function resetGame() {
    score = 0;
    hits = 0;
    misses = 0;
    timeLeft = roundSeconds;
    elapsed = 0;
    ended = false;
    active = null;
    spawnTimer = 0.5;
    cursorIndex = 0;
    hitFlashes = [];
  }

  function holeCenter(index) {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    const marginTop = 72;
    const marginSide = 32;
    const boardW = dims.width - marginSide * 2;
    const boardH = dims.height - marginTop - 32;
    const cellW = boardW / GRID_COLS;
    const cellH = boardH / GRID_ROWS;
    return {
      x: marginSide + cellW * col + cellW / 2,
      y: marginTop + cellH * row + cellH / 2,
    };
  }

  function randomSpawnGap() {
    return MIN_SPAWN_GAP + Math.random() * (MAX_SPAWN_GAP - MIN_SPAWN_GAP);
  }

  function spawnOne() {
    const isBaby = Math.random() < babyHamsterChance;
    const holeIndex = Math.floor(Math.random() * HOLE_COUNT);
    active = {
      holeIndex,
      isBaby,
      timeLeft: bugVisibleSeconds,
      emoji: isBaby ? BABY_HAMSTER_EMOJI : BUG_EMOJIS[Math.floor(Math.random() * BUG_EMOJIS.length)],
      hit: false,
    };
  }

  function whackHole(index) {
    if (ended || !active || active.hit || active.holeIndex !== index) return;
    active.hit = true;
    if (active.isBaby) {
      score = Math.max(0, score - 15);
      misses += 1;
      audio.play('./assets/audio/hit.mp3', { volume: 0.5 });
      hitFlashes.push({ index, color: '#ff6b6b', life: 0.35 });
    } else {
      score += 15;
      hits += 1;
      audio.play('./assets/audio/collect.mp3', { volume: 0.5 });
      hitFlashes.push({ index, color: '#7bd389', life: 0.35 });
    }
    active = null;
    spawnTimer = randomSpawnGap();
  }

  function update(dt) {
    if (ended) return;
    elapsed += dt;
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; finish(); return; }

    if (active) {
      active.timeLeft -= dt;
      if (active.timeLeft <= 0 && !active.hit) {
        if (!active.isBaby) misses += 1;
        active = null;
        spawnTimer = randomSpawnGap();
      }
    } else {
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawnOne();
    }

    hitFlashes = hitFlashes.filter((f) => {
      f.life -= dt;
      return f.life > 0;
    });
  }

  function drawHole(index) {
    const { x, y } = holeCenter(index);
    ctx.fillStyle = '#6b4a2b';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, HOLE_RADIUS, HOLE_RADIUS * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f2e1a';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, HOLE_RADIUS * 0.78, HOLE_RADIUS * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    const isCursor = index === cursorIndex;
    if (isCursor) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2d5a3d';
      ctx.beginPath();
      ctx.ellipse(x, y + 6, HOLE_RADIUS + 4, HOLE_RADIUS * 0.62 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (active && active.holeIndex === index && !active.hit) {
      ctx.font = `${HOLE_RADIUS * 1.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(active.emoji, x, y - 6);
    }

    const flash = hitFlashes.find((f) => f.index === index);
    if (flash) {
      ctx.globalAlpha = Math.max(0, flash.life / 0.35);
      ctx.fillStyle = flash.color;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, HOLE_RADIUS + 6, HOLE_RADIUS * 0.62 + 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#dff0d8';
    ctx.fillRect(0, 0, dims.width, dims.height);

    for (let i = 0; i < HOLE_COUNT; i++) drawHole(i);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#2d3a2e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⭐ ${score}`, 16, 28);
    ctx.textAlign = 'right';
    ctx.fillText(`⏱️ ${Math.ceil(timeLeft)}s`, dims.width - 16, 28);
    ctx.textAlign = 'center';
    ctx.fillText('Đập sâu 🐛, né hamster con 🐹!', dims.width / 2, 28);
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function computeStars() {
    if (score >= 300) return 3;
    if (score >= 150) return 2;
    if (score >= 60) return 1;
    return 0;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    onEnd({ score: Math.max(0, score), stars: computeStars(), durationMs: elapsed * 1000 });
  }

  function moveCursor(delta) {
    cursorIndex = (cursorIndex + delta + HOLE_COUNT) % HOLE_COUNT;
  }
  function moveCursorGrid(dr, dc) {
    let col = cursorIndex % GRID_COLS;
    let row = Math.floor(cursorIndex / GRID_COLS);
    col = Math.max(0, Math.min(GRID_COLS - 1, col + dc));
    row = Math.max(0, Math.min(GRID_ROWS - 1, row + dr));
    cursorIndex = row * GRID_COLS + col;
  }

  scope.on(window, 'keydown', (e) => {
    if (ended) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') moveCursorGrid(0, -1);
    else if (e.key === 'ArrowRight' || e.key === 'd') moveCursorGrid(0, 1);
    else if (e.key === 'ArrowUp' || e.key === 'w') moveCursorGrid(-1, 0);
    else if (e.key === 'ArrowDown' || e.key === 's') moveCursorGrid(1, 0);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      whackHole(cursorIndex);
    }
  });

  function pointerToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (dims.width / rect.width),
      y: (clientY - rect.top) * (dims.height / rect.height),
    };
  }
  function holeAtPoint(px, py) {
    for (let i = 0; i < HOLE_COUNT; i++) {
      const { x, y } = holeCenter(i);
      const dx = px - x;
      const dy = py - (y + 6);
      if ((dx * dx) / (HOLE_RADIUS * HOLE_RADIUS) + (dy * dy) / ((HOLE_RADIUS * 0.62) ** 2) <= 1.4) return i;
    }
    return -1;
  }
  scope.on(canvas, 'pointerdown', (e) => {
    const { x, y } = pointerToCanvas(e.clientX, e.clientY);
    const index = holeAtPoint(x, y);
    if (index >= 0) {
      cursorIndex = index;
      whackHole(index);
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
