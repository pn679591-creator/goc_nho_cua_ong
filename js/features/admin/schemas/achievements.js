export default {
  registry: 'achievements',
  label: 'Thành tựu',
  icon: '🏆',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên thành tựu', type: 'text', required: true },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
    { key: 'icon', label: 'Icon (emoji)', type: 'text' },
    { key: 'disabled', label: 'Tạm khoá', type: 'boolean' },
  ],
};
