export default {
  registry: 'games',
  label: 'Trò chơi',
  icon: '🎮',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id) — trùng js/games/<id>', type: 'text', required: true, immutable: true },
    { key: 'label', label: 'Tên hiển thị', type: 'text' },
    { key: 'enabled', label: 'Bật trò chơi', type: 'boolean', default: true },
    { key: 'maintenance', label: 'Bảo trì', type: 'boolean' },
    { key: 'energyCostOverride', label: 'Ghi đè năng lượng (JSON {de,thuong,kho})', type: 'json' },
    { key: 'dailyLimitOverride', label: 'Ghi đè giới hạn/ngày', type: 'number', min: 0 },
    { key: 'cooldownOverride', label: 'Ghi đè cooldown (giây)', type: 'number', min: 0 },
  ],
};
