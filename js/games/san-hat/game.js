// Hamster Săn Hạt — hamster di chuyển trái/phải để hứng hạt hướng dương
// rơi từ trên xuống. Đây là game THAM CHIẾU cho mọi minigame khác: xem
// js/games/README.md để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const HAMSTER_WIDTH = 64;
const HAMSTER_HEIGHT = 48;
const SEED_RADIUS = 12;

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('san-hat');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['san-hat'] || config || {};
  const durationSeconds = cfg.durationSeconds || 60;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let hamsterX = 0;
  let seeds = [];
  let powerUps = [];
  let score = 0;
  let seedsCaught = 0;
  let timeLeft = durationSeconds;
  let speed = cfg.speed?.[difficulty] ?? 8; // "ô" mỗi giây, quy đổi ra px/giây bên dưới
  const speedMax = cfg.speedMax?.[difficulty] ?? 18;
  const speedStepPerSeeds = cfg.speedStepPerSeeds ?? 5;
  const speedStep = cfg.speedStep ?? 0.25;
  const powerUpEverySeconds = cfg.powerUpEverySeconds?.[difficulty] ?? 8;

  let ended = false;
  let spawnTimer = 0;
  let powerUpTimer = 0;
  let keys = { left: false, right: false };
  let dragTargetX = null;

  function resetHamster() {
    hamsterX = dims.width / 2;
  }
  resetHamster();

  function spawnSeed() {
    seeds.push({ x: Math.random() * (dims.width - 2 * SEED_RADIUS) + SEED_RADIUS, y: -SEED_RADIUS, r: SEED_RADIUS });
  }
  function spawnPowerUp() {
    powerUps.push({ x: Math.random() * (dims.width - 2 * SEED_RADIUS) + SEED_RADIUS, y: -SEED_RADIUS, r: SEED_RADIUS + 4 });
  }

  function update(dt) {
    if (ended) return;
    timeLeft -= dt;
    if (timeLeft <= 0) { finish(); return; }

    const pxPerSec = 40 + speed * 18;
    const moveSpeed = 420;
    if (dragTargetX != null) {
      hamsterX += Math.sign(dragTargetX - hamsterX) * Math.min(Math.abs(dragTargetX - hamsterX), moveSpeed * dt);
    } else {
      if (keys.left) hamsterX -= moveSpeed * dt;
      if (keys.right) hamsterX += moveSpeed * dt;
    }
    hamsterX = Math.max(HAMSTER_WIDTH / 2, Math.min(dims.width - HAMSTER_WIDTH / 2, hamsterX));

    spawnTimer += dt;
    const spawnInterval = 1 / Math.max(1, speed * 0.6);
    if (spawnTimer >= spawnInterval) { spawnTimer = 0; spawnSeed(); }

    powerUpTimer += dt;
    if (powerUpTimer >= powerUpEverySeconds) { powerUpTimer = 0; spawnPowerUp(); }

    for (const seed of seeds) seed.y += pxPerSec * dt;
    for (const p of powerUps) p.y += pxPerSec * 0.9 * dt;

    const hamsterTop = dims.height - HAMSTER_HEIGHT - 8;
    seeds = seeds.filter((seed) => {
      if (seed.y > dims.height + 20) return false;
      if (seed.y + seed.r >= hamsterTop && Math.abs(seed.x - hamsterX) < HAMSTER_WIDTH / 2) {
        score += 10;
        seedsCaught += 1;
        audio.play('./assets/audio/collect.mp3', { volume: 0.5 });
        if (seedsCaught % speedStepPerSeeds === 0) speed = Math.min(speedMax, speed + speedStep);
        return false;
      }
      return true;
    });
    powerUps = powerUps.filter((p) => {
      if (p.y > dims.height + 20) return false;
      if (p.y + p.r >= hamsterTop && Math.abs(p.x - hamsterX) < HAMSTER_WIDTH / 2) {
        score += 30;
        audio.play('./assets/audio/powerup.mp3', { volume: 0.6 });
        return false;
      }
      return true;
    });
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.fillStyle = '#ffd166';
    for (const seed of seeds) {
      ctx.beginPath();
      ctx.arc(seed.x, seed.y, seed.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fb8500';
    for (const p of powerUps) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#6b4226';
    const hy = dims.height - HAMSTER_HEIGHT - 8;
    ctx.beginPath();
    ctx.roundRect(hamsterX - HAMSTER_WIDTH / 2, hy, HAMSTER_WIDTH, HAMSTER_HEIGHT, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⭐ ${score}`, dims.width - 50, 24);
    ctx.fillText(`⏱️ ${Math.ceil(timeLeft)}s`, 60, 24);
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
    onEnd({ score, stars: computeStars(), durationMs: (durationSeconds - Math.max(0, timeLeft)) * 1000 });
  }

  scope.on(window, 'keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  });
  scope.on(window, 'keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });

  function pointerToX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (dims.width / rect.width);
  }
  scope.on(canvas, 'pointerdown', (e) => { dragTargetX = pointerToX(e.clientX); });
  scope.on(canvas, 'pointermove', (e) => { if (e.pressure > 0 || e.buttons > 0) dragTargetX = pointerToX(e.clientX); });
  scope.on(window, 'pointerup', () => { dragTargetX = null; });

  const onResize = () => { dims = fitCanvasToContainer(canvas, canvas.parentElement); };
  scope.on(window, 'resize', onResize);

  return {
    start() { loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      score = 0; seedsCaught = 0; timeLeft = durationSeconds; seeds = []; powerUps = [];
      speed = cfg.speed?.[difficulty] ?? 8; ended = false; resetHamster();
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
