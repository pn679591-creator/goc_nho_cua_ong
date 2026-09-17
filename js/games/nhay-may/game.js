// Hamster Nhảy Mây — hamster tự bật nhảy lên cao, người chơi chỉ điều khiển
// trái/phải để hạ cánh trúng các đám mây. Một số mây vỡ sau một lần đáp, một
// số mây trôi ngang. Rơi khỏi đáy màn hình là thua. Xem js/games/README.md và
// js/games/san-hat/game.js (game tham chiếu) để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const HAMSTER_WIDTH = 44;
const HAMSTER_HEIGHT = 44;
const CLOUD_WIDTH = 76;
const CLOUD_HEIGHT = 24;
const MAX_JUMP_HEIGHT = 140; // px — chiều cao bật nhảy tối đa giả định
const GRAVITY = 1500; // px/s^2
const JUMP_VELOCITY = Math.sqrt(2 * GRAVITY * MAX_JUMP_HEIGHT); // px/s (hướng lên, âm)
const CLOUD_MOVE_SPEED = 70; // px/s cho mây trôi ngang
const CLOUD_MOVE_RANGE = 55; // px biên độ trôi ngang

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('nhay-may');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['nhay-may'] || config || {};

  const breakingChance = cfg.breakingCloudChance?.[difficulty] ?? 0.15;
  const movingChance = cfg.movingCloudChance?.[difficulty] ?? 0.2;
  const gapRatio = cfg.cloudGapRatioOfMaxJump?.[difficulty] ?? 0.75;
  const cloudGapBase = Math.min(MAX_JUMP_HEIGHT * 0.95, MAX_JUMP_HEIGHT * gapRatio);

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let hamster = { x: 0, y: 0, vy: 0, facing: 1 };
  let clouds = [];
  let nextCloudTopY = 0;
  let heightClimbed = 0; // px đã leo được (dùng để tính điểm)
  let elapsedMs = 0;
  let ended = false;
  let started = false;
  let keys = { left: false, right: false };
  let dragTargetX = null;

  function resetWorld() {
    hamster = {
      x: dims.width / 2,
      y: dims.height - 90,
      vy: -JUMP_VELOCITY,
      facing: 1,
    };
    clouds = [];
    heightClimbed = 0;
    elapsedMs = 0;
    dragTargetX = null;
    keys = { left: false, right: false };

    // Mây khởi đầu ngay dưới chân hamster (an toàn, không vỡ/trôi).
    clouds.push({
      x: hamster.x,
      y: hamster.y + HAMSTER_HEIGHT / 2 + CLOUD_HEIGHT / 2,
      breaking: false,
      moving: false,
      broken: false,
      baseX: hamster.x,
      moveSeed: Math.random() * Math.PI * 2,
    });
    nextCloudTopY = hamster.y - cloudGapBase;
    while (nextCloudTopY > -CLOUD_HEIGHT) {
      spawnCloudAt(nextCloudTopY);
      nextCloudTopY -= gapForNextCloud();
    }
  }

  function gapForNextCloud() {
    // Dao động nhẹ quanh mức chuẩn nhưng không vượt quá chiều cao nhảy tối đa.
    const jitter = 0.85 + Math.random() * 0.3;
    return Math.min(MAX_JUMP_HEIGHT * 0.95, cloudGapBase * jitter);
  }

  function spawnCloudAt(y) {
    const x = Math.random() * (dims.width - CLOUD_WIDTH) + CLOUD_WIDTH / 2;
    const breaking = Math.random() < breakingChance;
    const moving = Math.random() < movingChance;
    clouds.push({ x, y, breaking, moving, broken: false, baseX: x, moveSeed: Math.random() * Math.PI * 2 });
  }

  function ensureClouds() {
    while (nextCloudTopY > -CLOUD_HEIGHT - 40) {
      spawnCloudAt(nextCloudTopY);
      nextCloudTopY -= gapForNextCloud();
    }
  }

  resetWorld();

  function update(dt) {
    if (ended || !started) return;
    elapsedMs += dt * 1000;

    // Di chuyển ngang: kéo/chạm ưu tiên, nếu không thì dùng bàn phím.
    const moveSpeed = 480;
    if (dragTargetX != null) {
      const diff = dragTargetX - hamster.x;
      hamster.x += Math.sign(diff) * Math.min(Math.abs(diff), moveSpeed * dt);
    } else {
      if (keys.left) hamster.x -= moveSpeed * dt;
      if (keys.right) hamster.x += moveSpeed * dt;
    }
    if (keys.left && !keys.right) hamster.facing = -1;
    if (keys.right && !keys.left) hamster.facing = 1;

    // Xuyên biên màn hình kiểu Doodle Jump.
    const half = HAMSTER_WIDTH / 2;
    if (hamster.x < -half) hamster.x = dims.width + half;
    if (hamster.x > dims.width + half) hamster.x = -half;

    // Vật lý rơi/nhảy.
    hamster.vy += GRAVITY * dt;
    const prevY = hamster.y;
    hamster.y += hamster.vy * dt;

    // Va chạm mây: chỉ khi đang rơi xuống (vy > 0) và đi ngang qua mặt mây.
    if (hamster.vy > 0) {
      for (const cloud of clouds) {
        if (cloud.broken) continue;
        const cloudTop = cloud.y - CLOUD_HEIGHT / 2;
        const feetPrev = prevY + HAMSTER_HEIGHT / 2;
        const feetNow = hamster.y + HAMSTER_HEIGHT / 2;
        const withinX = Math.abs(hamster.x - cloud.x) < (CLOUD_WIDTH + HAMSTER_WIDTH) / 2 - 6;
        if (withinX && feetPrev <= cloudTop && feetNow >= cloudTop) {
          hamster.y = cloudTop - HAMSTER_HEIGHT / 2;
          hamster.vy = -JUMP_VELOCITY;
          audio.play('./assets/audio/jump.mp3', { volume: 0.5 });
          if (cloud.breaking) {
            cloud.broken = true;
          }
          break;
        }
      }
    }

    // Mây trôi ngang.
    for (const cloud of clouds) {
      if (!cloud.moving || cloud.broken) continue;
      cloud.x = cloud.baseX + Math.sin(elapsedMs / 500 + cloud.moveSeed) * CLOUD_MOVE_RANGE;
    }
    // Mây vỡ rơi dần khỏi màn hình để có hiệu ứng.
    for (const cloud of clouds) {
      if (cloud.broken) cloud.y += 260 * dt;
    }

    // Camera chỉ cuộn lên: nếu hamster vượt quá ngưỡng trên màn hình, đẩy cả
    // thế giới xuống và cộng dồn điểm độ cao.
    const viewThreshold = dims.height * 0.42;
    if (hamster.y < viewThreshold) {
      const delta = viewThreshold - hamster.y;
      hamster.y = viewThreshold;
      for (const cloud of clouds) cloud.y += delta;
      nextCloudTopY += delta;
      heightClimbed += delta;
      ensureClouds();
    }

    // Dọn mây đã trôi khỏi đáy màn hình.
    clouds = clouds.filter((c) => c.y < dims.height + CLOUD_HEIGHT + 40);

    // Rơi khỏi đáy màn hình => thua.
    if (hamster.y - HAMSTER_HEIGHT / 2 > dims.height + 40) {
      finish();
    }
  }

  function render() {
    // Nền trời gradient.
    const grad = ctx.createLinearGradient(0, 0, 0, dims.height);
    grad.addColorStop(0, '#cdeeff');
    grad.addColorStop(1, '#fef9f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, dims.width, dims.height);

    for (const cloud of clouds) {
      ctx.save();
      ctx.globalAlpha = cloud.broken ? 0.45 : 1;
      ctx.fillStyle = cloud.breaking ? '#ffd7c2' : '#ffffff';
      ctx.strokeStyle = 'rgba(120,120,120,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, CLOUD_WIDTH / 2, CLOUD_HEIGHT / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☁️', cloud.x, cloud.y - 2);
      if (cloud.moving) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#7aa8c9';
        ctx.fillText('↔', cloud.x, cloud.y + 16);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(hamster.x, hamster.y);
    ctx.scale(hamster.facing, 1);
    ctx.font = `${HAMSTER_HEIGHT}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐹', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#5c3a21';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`🏔️ Độ cao: ${scoreFromHeight()} m`, 14, 26);
  }

  function scoreFromHeight() {
    return Math.floor(heightClimbed / 8);
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function computeStars(score) {
    if (score >= 220) return 3;
    if (score >= 110) return 2;
    if (score >= 40) return 1;
    return 0;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    audio.play('./assets/audio/gameover.mp3', { volume: 0.5 });
    const score = scoreFromHeight();
    onEnd({ score, stars: computeStars(score), durationMs: Math.round(elapsedMs) });
  }

  scope.on(window, 'keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  });
  scope.on(window, 'keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
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
