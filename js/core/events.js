// Bus sự kiện toàn cục nhỏ gọn, dùng để các module không liên quan trực
// tiếp có thể giao tiếp (VD: admin bật Emergency Mode -> mọi trang nghe
// và hiện thông báo).
const listeners = new Map();

export const bus = {
  on(type, handler) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
    return () => bus.off(type, handler);
  },
  off(type, handler) {
    listeners.get(type)?.delete(handler);
  },
  emit(type, detail) {
    for (const handler of listeners.get(type) ?? []) {
      try { handler(detail); } catch (err) { console.error(`[events] handler lỗi cho "${type}"`, err); }
    }
  },
};
