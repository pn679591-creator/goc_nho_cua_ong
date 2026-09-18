// Trình quản lý âm thanh nhẹ, gắn với lifecycle scope để tự dừng khi huỷ trang/game.
export function createAudioPlayer(scope) {
  let muted = localStorage.getItem('gnco:muted') === '1';
  const cache = new Map();

  function getAudio(src) {
    if (!cache.has(src)) {
      const el = new Audio(src);
      el.preload = 'auto';
      scope.trackAudio(el);
      cache.set(src, el);
    }
    return cache.get(src);
  }

  return {
    play(src, { loop = false, volume = 1 } = {}) {
      if (muted) return;
      const el = getAudio(src);
      el.loop = loop;
      el.volume = volume;
      el.currentTime = 0;
      el.play().catch(() => { /* autoplay có thể bị chặn, bỏ qua */ });
    },
    stop(src) {
      const el = cache.get(src);
      if (el) { el.pause(); el.currentTime = 0; }
    },
    stopAll() {
      for (const el of cache.values()) { el.pause(); el.currentTime = 0; }
    },
    setMuted(value) {
      muted = value;
      localStorage.setItem('gnco:muted', value ? '1' : '0');
      if (value) this.stopAll();
    },
    isMuted() {
      return muted;
    },
  };
}
