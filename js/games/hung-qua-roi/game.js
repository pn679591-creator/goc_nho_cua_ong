// Hứng Quả Rơi — trái cây rơi từ trên xuống, người chơi di chuyển giỏ
// trái/phải để hứng. Vật phẩm xấu (sâu) phải né, mất mạng nếu hứng nhầm
// hoặc để rơi trái cây tốt xuống đất. Xem js/games/san-hat/game.js (tham
// chiếu) và js/games/README.md để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const BASKET_WIDTH = 84;
const BASKET_HEIGHT = 40;
const ITEM_RADIUS = 18;
const GOOD_EMOJIS = ['🍎', '🍓', '🍇', '🍊', '🍉'];
const BAD_EMOJIS = ['🐛', '🦟'];
const MAX_DURATION_SECONDS = 60;

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('hung-qua-roi');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['hung-qua-roi'] || config || {};

  const spawnEverySeconds = cfg.spawnEverySeconds?.[difficulty] ?? 1;
  const fallSpeedScreenPerSec = cfg.fallSpeedScreenPerSec?.[difficulty] ?? 0.4;
  const badItemChance = cfg.badItemChance?.[difficulty] ?? 0.15;
  const startLives = cfg.lives?.[difficulty] ?? 3;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let basketX = 0;
  let items = [];
  let score = 0;
  let lives = startLives;
  let timeElapsed = 0;
  let ended = false;
  let spawnTimer = 0;
  let keys = { left: false, right: false };
  let dragTargetX = null;

  function resetBasket() {
    basketX = dims.width / 2;
  }
  resetBasket();

  function spawnItem() {
    const isBad = Math.random() < badItemChance;
    const emojiSet = isBad ? BAD_EMOJIS : GOOD_EMOJIS;
    items.push({
      x: Math.random() * (dims.width - 2 * ITEM_RADIUS) + ITEM_RADIUS,
      y: -ITEM_RADIUS,
      r: ITEM_RADIUS,
      bad: isBad,
      emoji: emojiSet[Math.floor(Math.random() * emojiSet.length)],
    });
  }

  function update(dt) {
    if (ended) return;
    timeElapsed += dt;
    if (timeElapsed >= MAX_DURATION_SECONDS) { finish(); return; }

    const moveSpeed = 460;
    if (dragTargetX != null) {
      basketX += Math.sign(dragTargetX - basketX) * Math.min(Math.abs(dragTargetX - basketX), moveSpeed * dt);
    } else {
      if (keys.left) basketX -= moveSpeed * dt;
      if (keys.right) basketX += moveSpeed * dt;
    }
    basketX = Math.max(BASKET_WIDTH / 2, Math.min(dims.width - BASKET_WIDTH / 2, basketX));

    spawnTimer += dt;
    if (spawnTimer >= spawnEverySeconds) { spawnTimer = 0; spawnItem(); }

    const pxPerSec = fallSpeedScreenPerSec * dims.height;
    for (const item of items) item.y += pxPerSec * dt;

    const basketTop = dims.height - BASKET_HEIGHT - 8;
    items = items.filter((item) => {
      const caught = item.y + item.r >= basketTop && Math.abs(item.x - basketX) < BASKET_WIDTH / 2;
      if (caught) {
        if (item.bad) {
          lives -= 1;
          audio.play('./assets/audio/hit.mp3', { volume: 0.5 });
          if (lives <= 0) { finish(); return false; }
        } else {
          score += 10;
          audio.play('./assets/audio/collect.mp3', { volume: 0.5 });
        }
        return false;
      }
      if (item.y > dims.height + item.r) {
        if (!item.bad) {
          lives -= 1;
          if (lives <= 0) { finish(); return false; }
        }
        return false;
      }
      return true;
    });
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#e8f6ee';
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.font = `${ITEM_RADIUS * 2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const item of items) {
      ctx.fillText(item.emoji, item.x, item.y);
    }

    ctx.fillStyle = '#8d5524';
    const by = dims.height - BASKET_HEIGHT - 8;
    ctx.beginPath();
    ctx.roundRect(basketX - BASKET_WIDTH / 2, by, BASKET_WIDTH, BASKET_HEIGHT, 10);
    ctx.fill();
    ctx.font = '20px sans-serif';
    ctx.fillText('🧺', basketX, by + BASKET_HEIGHT / 2);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#2d3a2e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`⭐ ${score}`, dims.width - 50, 24);
    ctx.textAlign = 'left';
    let heartsStr = '';
    for (let i = 0; i < lives; i++) heartsStr += '❤️';
    ctx.fillText(heartsStr || '💔', 16, 24);
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function computeStars() {
    if (score >= 200) return 3;
    if (score >= 100) return 2;
    if (score >= 40) return 1;
    return 0;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    onEnd({ score, stars: computeStars(), durationMs: timeElapsed * 1000 });
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
      score = 0; lives = startLives; timeElapsed = 0; items = []; spawnTimer = 0;
      ended = false; resetBasket();
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
