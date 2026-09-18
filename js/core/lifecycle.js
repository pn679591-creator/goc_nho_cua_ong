// Mỗi trang / mỗi ván game được cấp một "scope" sống theo vòng đời của nó.
// scope.destroy() dọn sạch mọi listener, timer, animation frame, âm thanh,
// và Firestore onSnapshot còn treo lại — đảm bảo rời trang không để lại gì
// đang chạy ngầm.
export function createLifecycleScope(name = 'scope') {
  const controller = new AbortController();
  const timeouts = new Set();
  const intervals = new Set();
  const rafIds = new Set();
  const unsubscribers = new Set();
  const audioNodes = new Set();
  let destroyed = false;

  const scope = {
    name,
    signal: controller.signal,
    get destroyed() {
      return destroyed;
    },

    on(target, type, handler, options) {
      if (destroyed) return;
      target.addEventListener(type, handler, { ...options, signal: controller.signal });
    },

    setTimeout(fn, ms, ...args) {
      if (destroyed) return -1;
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        if (!destroyed) fn(...args);
      }, ms);
      timeouts.add(id);
      return id;
    },

    clearTimeout(id) {
      window.clearTimeout(id);
      timeouts.delete(id);
    },

    setInterval(fn, ms, ...args) {
      if (destroyed) return -1;
      const id = window.setInterval(() => fn(...args), ms);
      intervals.add(id);
      return id;
    },

    clearInterval(id) {
      window.clearInterval(id);
      intervals.delete(id);
    },

    requestAnimationFrame(fn) {
      if (destroyed) return -1;
      const id = window.requestAnimationFrame((t) => {
        rafIds.delete(id);
        if (!destroyed) fn(t);
      });
      rafIds.add(id);
      return id;
    },

    cancelAnimationFrame(id) {
      window.cancelAnimationFrame(id);
      rafIds.delete(id);
    },

    trackUnsubscribe(unsub) {
      if (destroyed) {
        try { unsub(); } catch { /* noop */ }
        return unsub;
      }
      unsubscribers.add(unsub);
      return unsub;
    },

    trackAudio(audioEl) {
      audioNodes.add(audioEl);
      return audioEl;
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort();
      for (const id of timeouts) window.clearTimeout(id);
      for (const id of intervals) window.clearInterval(id);
      for (const id of rafIds) window.cancelAnimationFrame(id);
      for (const unsub of unsubscribers) {
        try { unsub(); } catch (err) { console.error('[lifecycle] unsubscribe error', err); }
      }
      for (const audioEl of audioNodes) {
        try {
          audioEl.pause();
          audioEl.src = '';
        } catch { /* noop */ }
      }
      timeouts.clear();
      intervals.clear();
      rafIds.clear();
      unsubscribers.clear();
      audioNodes.clear();
    },
  };

  return scope;
}
