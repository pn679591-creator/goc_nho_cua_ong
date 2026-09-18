import { h } from '../core/ui.js';
import { onAuthReady, isOwner } from '../core/auth.js';
import { navigate } from '../router.js';
import { mountRegistryEditor } from '../features/admin/registry-editor.js';
import { ADMIN_SCHEMAS } from '../features/admin/schemas/index.js';
import { mountOverview } from '../features/admin/sections/overview.js';
import { mountOwnerInventory } from '../features/admin/sections/owner-inventory.js';
import { mountEconomyMaster } from '../features/admin/sections/economy.js';
import { mountEmergency } from '../features/admin/sections/emergency.js';
import { mountAuditLog } from '../features/admin/sections/audit-log.js';
import { mountUserControl } from '../features/admin/sections/user-control.js';
import { mountAssetManager } from '../features/admin/sections/asset-manager.js';
import { mountOperations } from '../features/admin/sections/operations.js';
import { mountDebug } from '../features/admin/sections/debug.js';

let cssLinkEl = null;

function mountTestMode(container) {
  container.append(
    h('h2', {}, '🧪 Chế độ thử'),
    h('div', { class: 'card' }, [
      h('p', {}, 'Thêm ?test=1 vào cuối bất kỳ đường dẫn trò chơi nào để vào Chế độ thử, ví dụ:'),
      h('code', {}, '#/arcade/san-hat?test=1'),
      h('p', { style: 'margin-top:var(--space-3)' }, 'Trong Chế độ thử: Free Play, không tốn năng lượng, không cooldown, không giới hạn/ngày. Kết quả KHÔNG được lưu vào ví, bảng xếp hạng hay thành tựu thật — luôn hiện huy hiệu "CHẾ ĐỘ THỬ" trên màn hình.'),
    ]),
  );
  return { destroy() {} };
}

const STATIC_SECTIONS = [
  { id: 'overview', label: '📊 Tổng quan', mount: mountOverview },
  { id: 'owner-inventory', label: '🎒 Kho đồ chủ nhà', mount: mountOwnerInventory },
  { id: 'test-mode', label: '🧪 Chế độ thử', mount: mountTestMode },
  { id: 'economy', label: '💰 Kinh tế', mount: mountEconomyMaster },
  { id: 'operations', label: '🛠️ Vận hành nâng cao', mount: mountOperations },
  { id: 'users', label: '👥 Người chơi', mount: mountUserControl },
  { id: 'assets', label: '🖼️ Ảnh (Asset Manager)', mount: mountAssetManager },
  { id: 'emergency', label: '🚨 Khẩn cấp', mount: mountEmergency },
  { id: 'audit', label: '📝 Nhật ký', mount: mountAuditLog },
  { id: 'debug', label: '🐞 Debug', mount: mountDebug },
];

function allSections() {
  const registrySections = ADMIN_SCHEMAS.map((schema) => ({
    id: `registry-${schema.registry}`,
    label: `${schema.icon || ''} ${schema.label}`,
    mount: (container, scope) => mountRegistryEditor(container, scope, schema),
  }));
  return [STATIC_SECTIONS[0], ...registrySections, ...STATIC_SECTIONS.slice(1)];
}

export default {
  mount(container, { scope, params }) {
    cssLinkEl = document.createElement('link');
    cssLinkEl.rel = 'stylesheet';
    cssLinkEl.href = './css/pages/admin.css?v=1.0.0';
    document.head.append(cssLinkEl);

    onAuthReady((user) => {
      if (!user || !isOwner()) {
        container.replaceChildren(h('div', { class: 'empty-state' }, [
          h('p', {}, '🔒 Khu vực này chỉ dành cho chủ nhà (Ong).'),
          h('a', { class: 'btn btn--primary', href: '#/' }, 'Về Trang chủ'),
        ]));
        return;
      }
      renderConsole();
    });

    function renderConsole() {
      const sections = allSections();
      const searchInput = h('input', { class: 'input', placeholder: '🔍 Tìm công cụ…', style: 'margin-bottom:var(--space-3)' });
      const nav = h('nav', { class: 'admin-sidebar' });
      const content = h('div', { class: 'admin-content' });
      const shell = h('div', { class: 'admin-shell' }, [nav, content]);

      let activeId = params.section && sections.find((s) => s.id === params.section) ? params.section : sections[0].id;
      let activeInstance = null;

      function renderNav(filter = '') {
        const filtered = sections.filter((s) => !filter || s.label.toLowerCase().includes(filter.toLowerCase()));
        nav.replaceChildren(...filtered.map((s) => h('button', {
          class: `admin-nav-btn ${s.id === activeId ? 'admin-nav-btn--active' : ''}`,
          onClick: () => selectSection(s.id),
        }, s.label)));
      }

      function selectSection(id) {
        activeId = id;
        navigate(`/quan-tri/${id}`);
        renderNav(searchInput.value);
        content.replaceChildren();
        const section = sections.find((s) => s.id === id);
        activeInstance = section?.mount(content, scope) || null;
      }

      searchInput.addEventListener('input', () => renderNav(searchInput.value));

      container.replaceChildren(h('h1', {}, '🛠️ Bảng Điều Khiển Chủ Nhà'), searchInput, shell);
      renderNav();
      content.replaceChildren();
      const initial = sections.find((s) => s.id === activeId);
      activeInstance = initial?.mount(content, scope) || null;
    }
  },
  destroy() {
    cssLinkEl?.remove();
    cssLinkEl = null;
  },
};
