export default {
  registry: 'bots',
  label: 'Bạn Ong',
  icon: '🐝',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên', type: 'text', required: true },
    { key: 'tag', label: 'Tính cách', type: 'text' },
    { key: 'cover', label: 'Ảnh bìa (assets/images/...)', type: 'image', required: true },
    { key: 'bio', label: 'Giới thiệu', type: 'textarea' },
    { key: 'disabled', label: 'Tạm ẩn', type: 'boolean' },
  ],
};
