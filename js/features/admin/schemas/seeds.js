export default {
  registry: 'seeds',
  label: 'Hạt giống',
  icon: '🌱',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên hạt giống', type: 'text', required: true },
    { key: 'cropId', label: 'Cây trồng ra (id crop)', type: 'text', required: true },
    { key: 'price', label: 'Giá mua', type: 'number', min: 0 },
    { key: 'currency', label: 'Loại tiền', type: 'select', options: ['coin', 'gem', 'ticket'] },
    { key: 'disabled', label: 'Tạm khoá', type: 'boolean' },
  ],
};
