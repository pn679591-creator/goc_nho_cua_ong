// Hamster Chạy Bánh Xe — hamster tự chạy, người chơi bấm/chạm/Space để nhảy
// né chướng ngại vật (xương rồng, đá). Tốc độ tăng dần theo quãng đường.
// Xem js/games/README.md và js/games/san-hat/game.js (game tham chiếu) để
// biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const HAMSTER_WIDTH = 46;
const HAMSTER_HEIGHT = 46;
const GROUND_MARGIN = 64; // khoảng cách từ đáy canvas tới mặt đất
const BASE_SPEED = 240; // px/s ở hệ số nhân 1x
const PIXELS_PER_METER = 30;
const GRAVITY = 1700; // px/s^2
const JUMP_VELOCITY = 560; // px/s (hướng lên, âm)
const OBSTACLE_KINDS = [
  { emoji: '🌵', width: 30, height: 46 },
  { emoji: '🪨', width: 34, height: 30 },
];

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('chay-banh-xe');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['chay-banh-xe'] || config || {};

  const startMultiplier = cfg.startSpeedMultiplier?.[difficulty] ?? 1;
  const speedIncreasePer100m = cfg.speedIncreasePer100m ?? 0.02;
  const minObstacleGapSeconds = cfg.minObstacleGapSeconds?.[difficulty] ?? 1.1;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let groundY = 0;
  let hamster = { y: 0, vy: 0 };
  let obstacles = [];
  let deco = []; // trang trí nền (mây/bụi cỏ) chạy song song cho vui mắt
  let distanceMeters = 0;
  let elapsedMs = 0;
  let obstacleTimer = 0;
  let ended = false;
  let started = false;
  let jumpQueued = false;

  function groundHamsterY() {
    return groundY - HAMSTER_HEIGHT / 2;
  }

  function resetWorld() {
    groundY = dims.height - GROUND_MARGIN;
    hamster = { y: groundHamsterY(), vy: 0 };
    obstacles = [];
    deco = Array.from({ length: 5 }, () => ({
      x: Math.random() * dims.width,
      y: 30 + Math.random() * 40,
      size: 16 + Math.random() * 14,
    }));
    distanceMeters = 0;
    elapsedMs = 0;
    obstacleTimer = randomObstacleGap();
    jumpQueued = false;
  }

  function randomObstacleGap() {
    return minObstacleGapSeconds + Math.random() * minObstacleGapSeconds * 0.8;
  }

  function currentSpeedMultiplier() {
    return startMultiplier + speedIncreasePer100m * (distanceMeters / 100);
  }
  function currentSpeed() {
    return BASE_SPEED * currentSpeedMultiplier();
  }

  resetWorld();

  const hamsterX = 90; // vị trí cố định của hamster trên màn hình

  function requestJump() {
    jumpQueued = true;
  }

  function update(dt) {
    if (ended || !started) return;
    elapsedMs += dt * 1000;

    const speed = currentSpeed();
    distanceMeters += (speed * dt) / PIXELS_PER_METER;

    // Nhảy: chỉ khi đang đứng trên mặt đất.
    const onGround = hamster.y >= groundHamsterY() - 0.5;
    if (jumpQueued && onGround) {
      hamster.vy = -JUMP_VELOCITY;
      audio.play('./assets/audio/jump.mp3', { volume: 0.5 });
    }
    jumpQueued = false;

    hamster.vy += GRAVITY * dt;
    hamster.y += hamster.vy * dt;
    if (hamster.y > groundHamsterY()) {
      hamster.y = groundHamsterY();
      hamster.vy = 0;
    }

    // Trang trí nền trôi chậm hơn để tạo hiệu ứng song song (parallax).
    for (const d of deco) {
      d.x -= speed * 0.4 * dt;
      if (d.x < -30) d.x = dims.width + 30;
    }

    // Sinh chướng ngại vật.
    obstacleTimer -= dt;
    if (obstacleTimer <= 0) {
      obstacleTimer = randomObstacleGap();
      const kind = OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)];
      obstacles.push({
        x: dims.width + kind.width,
        width: kind.width,
        height: kind.height,
        emoji: kind.emoji,
      });
    }

    // Di chuyển & va chạm.
    const hamsterLeft = hamsterX - HAMSTER_WIDTH / 2 + 8;
    const hamsterRight = hamsterX + HAMSTER_WIDTH / 2 - 8;
    const hamsterTop = hamster.y - HAMSTER_HEIGHT / 2 + 6;
    const hamsterBottom = hamster.y + HAMSTER_HEIGHT / 2;

    for (const obs of obstacles) {
      obs.x -= speed * dt;
      const obsLeft = obs.x - obs.width / 2 + 4;
      const obsRight = obs.x + obs.width / 2 - 4;
      const obsTop = groundY - obs.height;
      const obsBottom = groundY;
      const overlapX = hamsterRight > obsLeft && hamsterLeft < obsRight;
      const overlapY = hamsterBottom > obsTop && hamsterTop < obsBottom;
      if (overlapX && overlapY) {
        finish();
        return;
      }
    }
    obstacles = obstacles.filter((o) => o.x + o.width > -20);
  }

  function render() {
    const grad = ctx.createLinearGradient(0, 0, 0, dims.height);
    grad.addColorStop(0, '#fff3d6');
    grad.addColorStop(1, '#ffe1b0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.7;
    for (const d of deco) {
      ctx.font = `${d.size}px sans-serif`;
      ctx.fillText('☁️', d.x, d.y);
    }
    ctx.globalAlpha = 1;

    // Mặt đất.
    ctx.fillStyle = '#c98a4b';
    ctx.fillRect(0, groundY, dims.width, dims.height - groundY);
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(dims.width, groundY);
    ctx.stroke();

    for (const obs of obstacles) {
      ctx.font = `${obs.height}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(obs.emoji, obs.x, groundY + 2);
    }

    ctx.save();
    ctx.translate(hamsterX, hamster.y);
    ctx.font = `${HAMSTER_HEIGHT}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐹', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#5c3a21';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`🏃 Quãng đường: ${Math.floor(distanceMeters)} m`, 14, 26);
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function computeStars(score) {
    if (score >= 800) return 3;
    if (score >= 400) return 2;
    if (score >= 150) return 1;
    return 0;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    audio.play('./assets/audio/gameover.mp3', { volume: 0.5 });
    const score = Math.floor(distanceMeters);
    onEnd({ score, stars: computeStars(score), durationMs: Math.round(elapsedMs) });
  }

  scope.on(window, 'keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ' || e.code === 'Space') {
      e.preventDefault?.();
      requestJump();
    }
  });
  scope.on(canvas, 'pointerdown', () => { requestJump(); });

  const onResize = () => {
    dims = fitCanvasToContainer(canvas, canvas.parentElement);
    groundY = dims.height - GROUND_MARGIN;
    if (hamster.vy === 0) hamster.y = groundHamsterY();
  };
  scope.on(window, 'resize', onResize);

  return {
    start() { started = true; loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      ended = false;
      started = true;
      resetWorld();
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
