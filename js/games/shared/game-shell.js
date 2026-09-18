// Khung dùng chung cho mọi minigame: quản lý máy trạng thái
// TITLE → READY (3-2-1) → PLAYING ⇄ PAUSED → GAME_OVER → RESULT → REWARD,
// vẽ HUD/overlay, xử lý bàn phím (P tạm dừng, Esc thoát), tự tạm dừng khi
// đổi tab, và luồng nhận thưởng chỉ-một-lần qua js/core/db.js.
//
// Interface mà mỗi js/games/<id>/game.js phải xuất ra:
//   export function createGame({ canvas, difficulty, config, testMode, onEnd })
//   trả về { start(), pause(), resume(), restart(), destroy() }
// - onEnd({ score, stars }) được gọi đúng MỘT lần khi ván đấu kết thúc.
// - Vòng lặp cập nhật cố định 60 lần/giây, vẽ bằng requestAnimationFrame
//   (dùng js/core/anim.js#createFixedStepLoop và #fitCanvasToContainer).
// - Game tự tạo lifecycle scope riêng (js/core/lifecycle.js) để mọi
//   listener/timer/raf/audio được dọn sạch trong destroy().
import { h, formatNumber } from '../../core/ui.js';
import { showToast } from '../../core/toast.js';
import { getGameBalanceSettings, getEconomySettings, computeCurrentEnergy, startGameRun, finishGameRun, claimGameReward, subscribeUserDoc, getLastRunStartedAt } from '../../core/db.js';
import { getCurrentUser, isOwner } from '../../core/auth.js';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '../../config/economy.js';

let activeInstance = null;

export function mountGameShell(container, scope, { gameId, label, createGame }) {
  // Chỉ một game chạy tại một thời điểm: huỷ instance cũ nếu còn.
  if (activeInstance) {
    activeInstance.destroy();
    activeInstance = null;
  }

  const root = h('section', { class: 'game-shell' });
  const header = h('div', { class: 'game-shell__header' }, [
    h('h1', {}, label),
    h('div', { class: 'game-hud', id: 'hud' }),
  ]);
  const stageWrap = h('div', { class: 'game-shell__stage' });
  const canvas = h('canvas', {});
  const overlay = h('div', { class: 'game-overlay' });
  stageWrap.append(canvas, overlay);
  const controls = h('div', { class: 'game-controls' });
  root.append(header, stageWrap, controls);
  container.append(root);

  const hud = header.querySelector('#hud');
  let userEnergyData = null;
  let unsubUser = null;
  const user = getCurrentUser();
  if (user) {
    unsubUser = scope.trackUnsubscribe(subscribeUserDoc(user.uid, (d) => { userEnergyData = d; }));
  }

  let status = 'title'; // title | ready | playing | paused | game_over | result | reward
  let difficulty = 'thuong';
  let testMode = isOwner() && new URLSearchParams(location.hash.split('?')[1] || '').get('test') === '1';
  let gameInstance = null;
  let currentRunId = null;
  let freePlay = false;
  let lastResult = null;
  let ended = false; // guard chống onEnd gọi 2 lần

  function setHud(items) {
    hud.replaceChildren(...items.map((it) => h('span', { class: 'game-hud__item' }, it)));
  }

  function clearOverlay() {
    overlay.replaceChildren();
    overlay.style.display = 'none';
  }

  function showOverlay(children) {
    overlay.replaceChildren(...(Array.isArray(children) ? children : [children]));
    overlay.style.display = 'flex';
  }

  function renderControls(children) {
    controls.replaceChildren(...(Array.isArray(children) ? children : [children]));
  }

  function destroyGameInstance() {
    if (gameInstance) {
      try { gameInstance.destroy(); } catch (err) { console.error(`[${gameId}] lỗi khi huỷ game`, err); }
      gameInstance = null;
    }
  }

  function renderTitle() {
    status = 'title';
    ended = false;
    destroyGameInstance();
    clearOverlay();
    const economy = getEconomySettings();
    const cost = economy.energy.costByDifficulty[difficulty] ?? 8;
    const energy = userEnergyData ? computeCurrentEnergy(userEnergyData, economy) : economy.energy.max;
    const enoughEnergy = energy >= cost;

    const diffSelect = h('select', { class: 'select', onChange: (e) => { difficulty = e.target.value; renderTitle(); } });
    for (const d of DIFFICULTIES) {
      diffSelect.append(h('option', { value: d, selected: d === difficulty }, DIFFICULTY_LABELS[d]));
    }

    showOverlay([
      h('h2', {}, label),
      testMode ? h('span', { class: 'badge badge--test' }, 'CHẾ ĐỘ THỬ') : null,
      h('div', { class: 'field' }, [h('label', {}, 'Độ khó'), diffSelect]),
      h('p', {}, `Cần ${formatNumber(cost)} ⚡ · Bạn có ${formatNumber(energy)} ⚡`),
      h('div', { class: 'game-controls' }, [
        h('button', {
          class: 'btn btn--primary',
          onClick: () => beginRun(false),
          disabled: !enoughEnergy && !testMode,
        }, 'Bắt đầu'),
        h('button', { class: 'btn btn--ghost', onClick: () => beginRun(true) }, 'Chơi vui (không thưởng)'),
      ]),
    ]);
    renderControls([]);
  }

  async function beginRun(isFreePlay) {
    freePlay = isFreePlay || testMode;
    currentRunId = null;
    if (!freePlay) {
      const economy = getEconomySettings();
      const cooldownSeconds = economy.cooldownSecondsSameGame ?? 15;
      const user = getCurrentUser();
      if (cooldownSeconds > 0 && user) {
        const lastStartedAt = await getLastRunStartedAt(user.uid, gameId);
        if (lastStartedAt) {
          const remaining = cooldownSeconds - (Date.now() - lastStartedAt) / 1000;
          if (remaining > 0) {
            showToast(`Chờ ${Math.ceil(remaining)} giây nữa để chơi lượt có thưởng tiếp theo nhé.`, { type: 'info' });
            return;
          }
        }
      }
      try {
        currentRunId = await startGameRun({ gameId, difficulty, test: testMode });
      } catch (err) {
        console.error(err);
        showToast('Không thể bắt đầu lượt chơi, thử lại nhé.', { type: 'error' });
        return;
      }
    }
    runCountdown();
  }

  function runCountdown() {
    status = 'ready';
    let n = 3;
    const tick = () => {
      if (status !== 'ready') return;
      showOverlay(h('div', { class: 'countdown-number' }, n > 0 ? String(n) : 'Bắt đầu!'));
      if (n === 0) {
        scope.setTimeout(startPlaying, 400);
        return;
      }
      n -= 1;
      scope.setTimeout(tick, 700);
    };
    tick();
  }

  function startPlaying() {
    if (status !== 'ready') return;
    status = 'playing';
    clearOverlay();
    const balance = getGameBalanceSettings(gameId);
    gameInstance = createGame({
      canvas,
      difficulty,
      config: balance,
      testMode,
      onEnd: (result) => handleGameEnd(result),
    });
    activeInstance = { destroy: () => teardown() };
    gameInstance.start();
    renderControls([
      h('button', { class: 'btn btn--ghost', onClick: pauseGame }, '⏸️ Tạm dừng'),
      h('button', { class: 'btn btn--ghost', onClick: exitGame }, '🚪 Thoát'),
    ]);
  }

  function pauseGame() {
    if (status !== 'playing') return;
    status = 'paused';
    gameInstance?.pause();
    showOverlay([
      h('h2', {}, 'Tạm dừng'),
      h('div', { class: 'game-controls' }, [
        h('button', { class: 'btn btn--primary', onClick: resumeGame }, 'Tiếp tục'),
        h('button', { class: 'btn btn--ghost', onClick: exitGame }, 'Thoát'),
      ]),
    ]);
  }

  function resumeGame() {
    if (status !== 'paused') return;
    status = 'playing';
    clearOverlay();
    gameInstance?.resume();
  }

  function exitGame() {
    destroyGameInstance();
    renderTitle();
  }

  function handleGameEnd(result) {
    if (ended) return; // chặn onEnd gọi 2 lần
    ended = true;
    status = 'game_over';
    lastResult = { score: Math.max(0, Math.round(result?.score || 0)), stars: Math.min(3, Math.max(0, Math.round(result?.stars || 0))) };
    if (currentRunId && !freePlay) {
      finishGameRun(currentRunId, { score: lastResult.score, stars: lastResult.stars, durationMs: result?.durationMs || 0 }).catch((err) => console.error(err));
    }
    renderResult();
  }

  function renderResult() {
    status = 'result';
    clearOverlay();
    const stars = '⭐'.repeat(lastResult.stars) + '☆'.repeat(3 - lastResult.stars);
    const claimBtn = h('button', { class: 'btn btn--primary' }, 'Nhận thưởng');
    let claimed = freePlay;

    if (!freePlay) {
      claimBtn.addEventListener('click', async () => {
        if (claimBtn.disabled) return;
        claimBtn.disabled = true;
        claimBtn.textContent = 'Đang nhận…';
        try {
          const reward = await claimGameReward(currentRunId);
          claimed = true;
          showToast(`+${formatNumber(reward.coin)} 🌻 · +${formatNumber(reward.gem)} 🍯 · +${formatNumber(reward.ticket)} 🎟️ · +${formatNumber(reward.exp)} EXP`, { type: 'success' });
          claimBtn.textContent = 'Đã nhận ✔️';
          if (reward.overDailyLimit) showToast('Đã đạt giới hạn thưởng hôm nay cho trò này, chuyển sang Chơi vui.', { type: 'info' });
        } catch (err) {
          console.error(err);
          claimBtn.disabled = false;
          claimBtn.textContent = 'Thử lại';
          showToast(err.message || 'Không thể nhận thưởng, thử lại nhé.', { type: 'error' });
        }
      });
    }

    showOverlay([
      h('h2', {}, 'Kết quả'),
      h('div', { class: 'result-panel' }, [
        h('p', { class: 'result-panel__stars' }, stars),
        h('p', {}, `Điểm: ${formatNumber(lastResult.score)}`),
        testMode ? h('span', { class: 'badge badge--test' }, 'CHẾ ĐỘ THỬ — không ảnh hưởng ví thật') : null,
      ]),
      h('div', { class: 'game-controls' }, [
        !freePlay ? claimBtn : null,
        h('button', { class: 'btn btn--secondary', onClick: () => { destroyGameInstance(); renderTitle(); } }, 'Chơi lại'),
        h('button', { class: 'btn btn--ghost', onClick: () => { destroyGameInstance(); history.back(); } }, 'Thoát'),
      ]),
    ]);
  }

  function onKeydown(e) {
    if (e.key === 'p' || e.key === 'P') {
      if (status === 'playing') pauseGame();
      else if (status === 'paused') resumeGame();
    } else if (e.key === 'Escape') {
      if (status === 'playing' || status === 'paused') exitGame();
    }
  }
  scope.on(window, 'keydown', onKeydown);

  function onVisibility() {
    if (document.hidden && status === 'playing') pauseGame();
  }
  scope.on(document, 'visibilitychange', onVisibility);
  scope.on(window, 'blur', () => { if (status === 'playing') pauseGame(); });

  function teardown() {
    destroyGameInstance();
    unsubUser?.();
  }

  scope.trackUnsubscribe(() => teardown());
  activeInstance = { destroy: teardown };

  renderTitle();

  return { destroy: teardown };
}
