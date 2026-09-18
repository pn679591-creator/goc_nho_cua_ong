import { registerRoute, setNotFound, startRouter, navigate, getCurrentPath } from './router.js';
import { ensureSignedIn, onAuthReady, isOwner, getCurrentUser } from './core/auth.js';
import { subscribeUserDoc, onFlagsChange, computeCurrentEnergy, getEconomySettings, onBalanceChange } from './core/db.js';
import { setState, subscribeStore, getState } from './core/store.js';
import { h, formatNumber } from './core/ui.js';
import { showToast } from './core/toast.js';
import { APP_VERSION, APP_NAME } from './config/app-config.js';
import { CURRENCIES } from './config/economy.js';

registerRoute('/', () => import('./pages/home.js'));
registerRoute('/farm', () => import('./pages/farm.js'));
registerRoute('/arcade', () => import('./pages/arcade.js'));
registerRoute('/arcade/:id', () => import('./pages/game-play.js'));
registerRoute('/shop', () => import('./pages/shop.js'));
registerRoute('/tarot', () => import('./pages/tarot.js'));
registerRoute('/bots', () => import('./pages/bots.js'));
registerRoute('/bots/:id', () => import('./pages/bot-detail.js'));
registerRoute('/profile', () => import('./pages/profile.js'));
registerRoute('/quan-tri', () => import('./pages/admin.js'));
registerRoute('/quan-tri/:section', () => import('./pages/admin.js'));
setNotFound(() => import('./pages/not-found.js'));

const navLinks = [
  { path: '/', label: 'Trang chủ', icon: '🏠' },
  { path: '/farm', label: 'Nông trại', icon: '🌱' },
  { path: '/arcade', label: 'Khu vui chơi', icon: '🎮' },
  { path: '/shop', label: 'Cửa hàng', icon: '🛒' },
  { path: '/tarot', label: 'Tarot', icon: '🔮' },
  { path: '/bots', label: 'Bạn Ong', icon: '🐝' },
  { path: '/profile', label: 'Hồ sơ', icon: '👤' },
];

function buildShell() {
  const appVersionEl = document.getElementById('app-version');
  if (appVersionEl) appVersionEl.textContent = `v${APP_VERSION}`;

  const nav = document.getElementById('main-nav');
  nav.replaceChildren(...navLinks.map((link) =>
    h('a', {
      href: `#${link.path}`,
      class: 'nav-link',
      dataset: { path: link.path },
      onClick: (e) => { e.preventDefault(); navigate(link.path); closeMobileNav(); },
    }, [h('span', { class: 'nav-link__icon', 'aria-hidden': 'true' }, link.icon), h('span', { class: 'nav-link__label' }, link.label)]),
  ));

  const adminLink = document.getElementById('admin-link');
  window.addEventListener('hashchange', updateActiveNav);
  updateActiveNav();

  function updateActiveNav() {
    const path = getCurrentPath();
    for (const a of nav.querySelectorAll('.nav-link')) {
      a.classList.toggle('nav-link--active', a.dataset.path === path || (a.dataset.path !== '/' && path.startsWith(a.dataset.path)));
    }
  }

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
  });
  function closeMobileNav() {
    document.body.classList.remove('nav-open');
  }

  function refreshAdminLink() {
    if (adminLink) adminLink.style.display = isOwner() ? '' : 'none';
  }
  onAuthReady(refreshAdminLink);

  return { updateActiveNav, refreshAdminLink };
}

function bindWalletDisplay() {
  const walletEl = document.getElementById('wallet-display');
  if (!walletEl) return;
  const parts = {};
  for (const c of Object.values(CURRENCIES)) {
    const span = h('span', { class: 'wallet-chip', title: c.name }, [c.icon, ' ', h('b', {}, '0')]);
    parts[c.id] = span.querySelector('b');
    walletEl.append(span);
  }
  let unsubUser = null;
  onAuthReady((user) => {
    unsubUser?.();
    if (!user) return;
    unsubUser = subscribeUserDoc(user.uid, (data) => {
      if (!data) return;
      setState({ userData: data });
      const economy = getEconomySettings();
      const wallet = data.wallet || {};
      parts.coin.textContent = formatNumber(wallet.coin || 0);
      parts.gem.textContent = formatNumber(wallet.gem || 0);
      parts.ticket.textContent = formatNumber(wallet.ticket || 0);
      parts.energy.textContent = `${formatNumber(computeCurrentEnergy(data, economy))}/${economy.energy.max}`;
    });
  });
}

function bindEmergencyBanner() {
  const banner = document.getElementById('emergency-banner');
  if (!banner) return;
  onFlagsChange((flags) => {
    setState({ flags });
    const active = Object.entries(flags || {}).filter(([, v]) => v);
    if (!active.length) {
      banner.style.display = 'none';
      banner.textContent = '';
      return;
    }
    const messages = {
      maintenanceMode: 'Ong đang bảo trì tổ ong, một số tính năng tạm khoá.',
      disableAllGames: 'Khu vui chơi đang tạm nghỉ.',
      disableEconomy: 'Hệ thống phần thưởng đang tạm dừng.',
      disableShop: 'Cửa hàng đang tạm đóng cửa.',
      disableSteal: 'Tính năng ăn trộm đang tạm khoá.',
      disableFarm: 'Nông trại đang tạm bảo trì.',
      disableUserUpload: 'Tải ảnh lên đang tạm khoá.',
    };
    banner.style.display = 'block';
    banner.textContent = '🔧 ' + active.map(([k]) => messages[k] || k).join(' · ');
  });
}

async function boot() {
  buildShell();
  bindWalletDisplay();
  bindEmergencyBanner();
  startRouter(document.getElementById('app-outlet'));
  try {
    await ensureSignedIn();
  } catch (err) {
    console.error('[app] đăng nhập ẩn danh thất bại', err);
    showToast('Không thể kết nối máy chủ. Vui lòng kiểm tra cấu hình Firebase.', { type: 'error', duration: 6000 });
  }
}

boot();
