// Store trạng thái toàn cục nhỏ gọn (không phụ thuộc framework nào).
const state = {
  user: null,
  userData: null,
  roles: null,
  flags: {},
};

const subscribers = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of subscribers) fn(state);
}

export function subscribeStore(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
