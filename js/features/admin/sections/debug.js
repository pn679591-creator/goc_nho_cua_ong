import { h } from '../../../core/ui.js';
import { APP_VERSION, SECURITY_MODE } from '../../../config/app-config.js';
import { getCurrentPath } from '../../../router.js';

export function mountDebug(container) {
  container.append(h('h2', {}, '🐞 Debug'));
  container.append(h('div', { class: 'card' }, [
    h('p', {}, `Route hiện tại: ${getCurrentPath()}`),
    h('p', {}, `Phiên bản: v${APP_VERSION}`),
    h('p', {}, `Chế độ bảo mật: ${SECURITY_MODE}`),
    h('p', {}, `User agent: ${navigator.userAgent}`),
  ]));
  return { destroy() {} };
}
