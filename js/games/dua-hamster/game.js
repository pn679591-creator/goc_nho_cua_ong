// Đua Hamster — tap/click/Space liên tục để tạo các cú "bứt tốc" (burst) đẩy
// hamster về phía trước, tốc độ giảm dần (ma sát) nếu ngừng tap. Đua với 1
// hamster AI chạy tốc độ ổn định tới đích. Xem js/games/san-hat/game.js (tham
// chiếu) và js/games/README.md để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const TAP_IMPULSE = 8; // đơn vị/giây cộng thêm mỗi lần tap
const FRICTION = 4; // đơn vị/giây^2 giảm tốc khi không tap
const MAX_SPEED = 40; // đơn vị/giây tối đa của người chơi
const BASELINE_AVG_SPEED = 7; // tốc độ trung bình quy ước của "người tap đều tay"
const LANE_PADDING = 24;
const HAMSTER_SIZE = 40;

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('dua-hamster');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['dua-hamster'] || config || {};

  const raceDistance = cfg.raceDistance || 100;
  const aiSpeedMultiplier = cfg.aiSpeedMultiplier?.[difficulty] ?? 1;
  const aiBaseSpeed = BASELINE_AVG_SPEED * aiSpeedMultiplier;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let playerPos = 0;
  let playerVelocity = 0;
  let aiPos = 0;
  let tapCount = 0;
  let elapsedTime = 0;
  let ended = false;
  let winner = null; // 'player' | 'ai'

  function tap() {
    if (ended) return;
    playerVelocity = Math.min(MAX_SPEED, playerVelocity + TAP_IMPULSE);
    tapCount += 1;
    audio.play('./assets/audio/tap.mp3', { volume: 0.25 });
  }

  function computeStars() {
    if (winner === 'player') return 3;
    const frac = Math.min(1, playerPos / raceDistance);
    if (frac >= 0.85) return 1;
    return 0;
  }

  function finish(who) {
    if (ended) return;
    ended = true;
    winner = who;
    loop.stop();
    let score;
    if (who === 'player') {
      const timeBonus = Math.max(0, Math.round(30 - elapsedTime));
      score = Math.min(100, 65 + timeBonus);
    } else {
      const frac = Math.min(1, playerPos / raceDistance);
      score = Math.round(50 * frac);
    }
    audio.play(who === 'player' ? './assets/audio/win.mp3' : './assets/audio/lose.mp3', { volume: 0.5 });
    onEnd({ score, stars: computeStars(), durationMs: Math.round(elapsedTime * 1000) });
  }

  function update(dt) {
    if (ended) return;

    elapsedTime += dt;

    playerVelocity = Math.max(0, playerVelocity - FRICTION * dt);
    playerPos += playerVelocity * dt;

    const wobble = 1 + Math.sin(elapsedTime * 2.4) * 0.12;
    aiPos += aiBaseSpeed * wobble * dt;

    if (playerPos >= raceDistance && aiPos >= raceDistance) {
      finish(playerPos >= aiPos ? 'player' : 'ai');
    } else if (playerPos >= raceDistance) {
      playerPos = raceDistance;
      finish('player');
    } else if (aiPos >= raceDistance) {
      aiPos = raceDistance;
      finish('ai');
    }
  }

  function drawTrack(y, pos, color, emoji, label) {
    const trackW = dims.width - LANE_PADDING * 2;
    ctx.strokeStyle = '#e0c088';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(LANE_PADDING, y);
    ctx.lineTo(LANE_PADDING + trackW, y);
    ctx.stroke();

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏁', LANE_PADDING + trackW, y - 18);

    const frac = Math.min(1, pos / raceDistance);
    const x = LANE_PADDING + trackW * frac;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - HAMSTER_SIZE / 2, y - HAMSTER_SIZE - 4, HAMSTER_SIZE, HAMSTER_SIZE, 10);
    ctx.fill();
    ctx.font = `${Math.floor(HAMSTER_SIZE * 0.7)}px sans-serif`;
    ctx.fillText(emoji, x, y - HAMSTER_SIZE / 2 - 2);

    ctx.fillStyle = '#6b4226';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, LANE_PADDING, y - HAMSTER_SIZE - 14);
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, dims.width, dims.height);

    const laneAiY = dims.height * 0.42;
    const lanePlayerY = dims.height * 0.72;
    drawTrack(laneAiY, aiPos, '#a0522d', '🐹', 'AI');
    drawTrack(lanePlayerY, playerPos, '#8b5cf6', '🐹', 'Bạn');

    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b4226';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`📏 ${Math.round(Math.min(playerPos, raceDistance))}/${raceDistance}`, dims.width / 2, 26);

    if (!ended) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#6b4226';
      ctx.fillText('👆 Chạm / nhấp / phím Cách liên tục để tăng tốc', dims.width / 2, dims.height - 16);
    } else {
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = winner === 'player' ? '#2a9d8f' : '#e63946';
      ctx.fillText(winner === 'player' ? '🎉 Bạn đã về đích trước!' : '🐹 AI đã về đích trước!', dims.width / 2, dims.height - 20);
    }
  }

  const loop = createFixedStepLoop(scope, { update, render });

  scope.on(canvas, 'pointerdown', () => tap());
  scope.on(window, 'keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      tap();
    }
  });

  const onResize = () => { dims = fitCanvasToContainer(canvas, canvas.parentElement); };
  scope.on(window, 'resize', onResize);

  return {
    start() { loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      playerPos = 0; playerVelocity = 0; aiPos = 0; tapCount = 0;
      elapsedTime = 0; ended = false; winner = null;
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
