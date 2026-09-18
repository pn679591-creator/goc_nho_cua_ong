// Câu Cá Ao Hồng — giữ vùng bắt cá trùng với cá đang bơi qua lại trên một
// thanh ngang, rồi bấm/nhấn liên tục (chạm hoặc phím cách) để "kéo cần" và
// làm đầy đồng hồ sức kéo trong lúc cá nằm trong vùng bắt. Xem
// js/games/san-hat/game.js (tham chiếu) và js/games/README.md để biết
// interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const METER_FILL_PER_PULSE = 11;
const METER_DRAIN_PER_SECOND = 26;
const ZONE_MOVE_SPEED = 460; // px/giây khi kéo bằng chuột/chạm hoặc mũi tên
const FLIP_MIN_SECONDS = 0.45;
const FLIP_MAX_SECONDS = 1.35;
const FISH_EMOJIS = ['🐟', '🐠', '🐡'];

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('cau-ca');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['cau-ca'] || config || {};

  const catchZoneRatio = cfg.catchZoneRatio?.[difficulty] ?? 0.3;
  const fishSpeedMultiplier = cfg.fishSpeedMultiplier?.[difficulty] ?? 1;
  const roundSeconds = cfg.roundSeconds || 60;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let barX0 = 0;
  let barX1 = 0;
  let barY = 0;
  let barLength = 0;
  let zoneWidthPx = 0;

  function layoutBar() {
    barX0 = 48;
    barX1 = dims.width - 48;
    barLength = Math.max(40, barX1 - barX0);
    barY = dims.height * 0.56;
    zoneWidthPx = Math.max(24, catchZoneRatio * barLength);
  }
  layoutBar();

  let zoneCenter = dims.width / 2;
  let dragTargetX = null;
  let keys = { left: false, right: false };

  let fishX = barX0 + barLength * 0.3;
  let fishDir = 1;
  let fishFlipTimer = 1;
  let fishEmoji = FISH_EMOJIS[0];

  let meter = 0;
  let progressed = false;
  let score = 0;
  let fishCaught = 0;
  let streak = 0;
  let timeLeft = roundSeconds;
  let elapsed = 0;
  let ended = false;
  let celebrateTimer = 0;
  let popups = [];
  let pulsePop = 0; // pulso visual khi bấm nhưng không thành công

  function fishSpeedPxPerSec() {
    return barLength * 0.38 * fishSpeedMultiplier;
  }

  function respawnFish(randomizeSide) {
    fishX = randomizeSide
      ? barX0 + Math.random() * barLength
      : Math.max(barX0, Math.min(barX1, fishX));
    fishDir = Math.random() < 0.5 ? -1 : 1;
    fishFlipTimer = FLIP_MIN_SECONDS + Math.random() * (FLIP_MAX_SECONDS - FLIP_MIN_SECONDS);
    fishEmoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
  }
  respawnFish(true);

  function isAligned() {
    return Math.abs(fishX - zoneCenter) <= zoneWidthPx / 2;
  }

  function pulse() {
    if (ended || celebrateTimer > 0) return;
    if (isAligned()) {
      meter = Math.min(100, meter + METER_FILL_PER_PULSE);
      progressed = true;
      audio.play('./assets/audio/collect.mp3', { volume: 0.3 });
      if (meter >= 100) catchFish();
    } else {
      pulsePop = 0.15;
    }
  }

  function catchFish() {
    fishCaught += 1;
    const gained = 60 + Math.min(40, streak * 10);
    streak += 1;
    score += gained;
    meter = 0;
    progressed = false;
    celebrateTimer = 0.6;
    popups.push({ x: zoneCenter, y: barY - 30, text: `+${gained} 🎉`, t: 1 });
    audio.play('./assets/audio/powerup.mp3', { volume: 0.6 });
  }

  function escapeFish() {
    streak = 0;
    meter = 0;
    progressed = false;
    popups.push({ x: zoneCenter, y: barY - 30, text: 'Cá vuột mất!', t: 0.8 });
    audio.play('./assets/audio/hit.mp3', { volume: 0.4 });
  }

  function clampZone() {
    const half = zoneWidthPx / 2;
    zoneCenter = Math.max(barX0 + half, Math.min(barX1 - half, zoneCenter));
  }

  function update(dt) {
    if (ended) return;
    elapsed += dt;
    timeLeft -= dt;
    if (timeLeft <= 0) { finish(); return; }

    if (celebrateTimer > 0) {
      celebrateTimer -= dt;
    } else {
      const speed = fishSpeedPxPerSec();
      fishX += fishDir * speed * dt;
      if (fishX <= barX0) { fishX = barX0; fishDir = 1; }
      if (fishX >= barX1) { fishX = barX1; fishDir = -1; }
      fishFlipTimer -= dt;
      if (fishFlipTimer <= 0) {
        fishDir = Math.random() < 0.5 ? -1 : 1;
        fishFlipTimer = FLIP_MIN_SECONDS + Math.random() * (FLIP_MAX_SECONDS - FLIP_MIN_SECONDS);
      }
    }

    if (dragTargetX != null) {
      const diff = dragTargetX - zoneCenter;
      zoneCenter += Math.sign(diff) * Math.min(Math.abs(diff), ZONE_MOVE_SPEED * dt);
    } else {
      if (keys.left) zoneCenter -= ZONE_MOVE_SPEED * dt;
      if (keys.right) zoneCenter += ZONE_MOVE_SPEED * dt;
    }
    clampZone();

    if (!isAligned()) {
      meter = Math.max(0, meter - METER_DRAIN_PER_SECOND * dt);
      if (meter <= 0 && progressed) escapeFish();
    }

    if (pulsePop > 0) pulsePop -= dt;
    popups = popups.filter((p) => {
      p.t -= dt;
      p.y -= 20 * dt;
      return p.t > 0;
    });
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#ffe3ee';
    ctx.fillRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#ffc4dd';
    ctx.fillRect(0, dims.height * 0.4, dims.width, dims.height * 0.6);

    ctx.font = `${Math.floor(dims.width * 0.04)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('🌸', 20, 40);
    ctx.textAlign = 'right';
    ctx.fillText('🌸', dims.width - 20, 40);

    // Thanh cần câu
    ctx.strokeStyle = '#c96a9e';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(barX0, barY);
    ctx.lineTo(barX1, barY);
    ctx.stroke();

    // Vùng bắt cá
    const alignedNow = isAligned();
    ctx.fillStyle = alignedNow ? 'rgba(255,183,3,0.55)' : 'rgba(107,66,38,0.35)';
    ctx.beginPath();
    ctx.roundRect(zoneCenter - zoneWidthPx / 2, barY - 22, zoneWidthPx, 44, 12);
    ctx.fill();
    ctx.strokeStyle = alignedNow ? '#ffb703' : '#6b4226';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cá
    ctx.font = `${Math.floor(dims.width * 0.06)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(fishX, barY);
    ctx.scale(fishDir >= 0 ? 1 : -1, 1);
    ctx.fillText(fishEmoji, 0, 0);
    ctx.restore();

    if (celebrateTimer > 0) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#2d3a2e';
      ctx.fillText('Bắt được cá! 🎣', dims.width / 2, barY - 60);
    }

    // Đồng hồ sức kéo
    const meterW = Math.min(320, dims.width - 48);
    const meterX = (dims.width - meterW) / 2;
    const meterY = dims.height * 0.78;
    const meterH = 24;
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath();
    ctx.roundRect(meterX, meterY, meterW, meterH, 12);
    ctx.fill();
    ctx.fillStyle = meter >= 80 ? '#2a9d8f' : meter >= 40 ? '#ffb703' : '#e76f51';
    ctx.beginPath();
    ctx.roundRect(meterX, meterY, (meterW * meter) / 100, meterH, 12);
    ctx.fill();
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(meterX, meterY, meterW, meterH, 12);
    ctx.stroke();
    ctx.fillStyle = '#6b4226';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Sức kéo ${Math.round(meter)}%`, meterX + meterW / 2, meterY + meterH / 2 + 1);

    if (pulsePop > 0) {
      ctx.fillStyle = `rgba(217,4,41,${Math.max(0, pulsePop / 0.15)})`;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('Chưa trúng!', zoneCenter, barY + 44);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d94a1c';
    ctx.font = 'bold 16px sans-serif';
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.t));
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#2d3a2e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🎣 Cá: ${fishCaught}`, 16, 26);
    ctx.textAlign = 'right';
    ctx.fillText(`⭐ ${score}`, dims.width - 16, 26);
    ctx.textAlign = 'center';
    ctx.fillText(`⏱️ ${Math.ceil(Math.max(0, timeLeft))}s`, dims.width / 2, 26);
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function computeStars() {
    if (score >= 320) return 3;
    if (score >= 160) return 2;
    if (score >= 50) return 1;
    return 0;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    onEnd({ score, stars: computeStars(), durationMs: Math.round(elapsed * 1000) });
  }

  scope.on(window, 'keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      pulse();
    }
  });
  scope.on(window, 'keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  function pointerToX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (dims.width / rect.width);
  }
  scope.on(canvas, 'pointerdown', (e) => {
    dragTargetX = pointerToX(e.clientX);
    pulse();
  });
  scope.on(canvas, 'pointermove', (e) => {
    if (e.pressure > 0 || e.buttons > 0) dragTargetX = pointerToX(e.clientX);
  });
  scope.on(window, 'pointerup', () => { dragTargetX = null; });

  const onResize = () => {
    dims = fitCanvasToContainer(canvas, canvas.parentElement);
    layoutBar();
    clampZone();
  };
  scope.on(window, 'resize', onResize);

  return {
    start() { loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      score = 0;
      fishCaught = 0;
      streak = 0;
      meter = 0;
      progressed = false;
      timeLeft = roundSeconds;
      elapsed = 0;
      ended = false;
      celebrateTimer = 0;
      popups = [];
      pulsePop = 0;
      dragTargetX = null;
      keys = { left: false, right: false };
      layoutBar();
      zoneCenter = dims.width / 2;
      clampZone();
      respawnFish(true);
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
