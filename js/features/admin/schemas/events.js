export default {
  registry: 'events',
  label: 'Sự kiện',
  icon: '🎉',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên sự kiện', type: 'text', required: true },
    { key: 'type', label: 'Loại', type: 'select', options: ['2x-coin', '2x-exp', 'rare-drop', 'special-crop', 'special-shop', 'special-game', 'limited-tarot'] },
    { key: 'startAt', label: 'Bắt đầu (ISO datetime)', type: 'text' },
    { key: 'endAt', label: 'Kết thúc (ISO datetime)', type: 'text' },
    { key: 'active', label: 'Đang diễn ra', type: 'boolean' },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
  ],
};
