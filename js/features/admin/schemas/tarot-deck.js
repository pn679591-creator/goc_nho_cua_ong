export default {
  registry: 'tarotDeck',
  label: 'Bộ bài Tarot',
  icon: '🔮',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên lá bài', type: 'text', required: true },
    { key: 'image', label: 'Ảnh (assets/images/...)', type: 'image', required: true },
    { key: 'upright', label: 'Ý nghĩa xuôi', type: 'textarea', required: true },
    { key: 'reversed', label: 'Ý nghĩa ngược', type: 'textarea', required: true },
    { key: 'rarity', label: 'Độ hiếm', type: 'select', options: ['thuong', 'hiem', 'sieu-hiem'] },
    { key: 'disabled', label: 'Tạm khoá', type: 'boolean' },
  ],
};
