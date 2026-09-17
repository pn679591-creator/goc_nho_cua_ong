// Vòng lặp cập nhật theo bước thời gian cố định (fixed timestep) dùng chung
// cho mọi minigame: update() chạy đúng 60 lần/giây bất kể tốc độ khung hình,
// render() chạy theo requestAnimationFrame.
export function createFixedStepLoop(scope, { updateHz = 60, update, render } = {}) {
  const stepMs = 1000 / updateHz;
  let acc = 0;
  let last = 0;
  let running = false;
  let rafId = -1;

  function frame(t) {
    if (!running) return;
    if (!last) last = t;
    let delta = t - last;
    last = t;
    if (delta > 250) delta = 250; // tránh "nhảy cóc" khi tab bị ẩn lâu
    acc += delta;
    while (acc >= stepMs) {
      update?.(stepMs / 1000);
      acc -= stepMs;
    }
    render?.(acc / stepMs);
    rafId = scope.requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      acc = 0;
      rafId = scope.requestAnimationFrame(frame);
    },
    pause() {
      running = false;
      scope.cancelAnimationFrame(rafId);
    },
    resume() {
      if (running) return;
      running = true;
      last = 0;
      rafId = scope.requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      scope.cancelAnimationFrame(rafId);
    },
    get running() {
      return running;
    },
  };
}

export function fitCanvasToContainer(canvas, container) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = container.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: w, height: h, dpr, ctx };
}
