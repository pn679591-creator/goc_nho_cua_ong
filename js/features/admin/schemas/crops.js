export default {
  registry: 'crops',
  label: 'Cây trồng',
  icon: '🌾',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên cây', type: 'text', required: true },
    { key: 'image', label: 'Ảnh (assets/images/...)', type: 'image', required: true },
    { key: 'growSeconds', label: 'Thời gian lớn (giây)', type: 'number', min: 1, required: true },
    { key: 'sellPrice', label: 'Giá bán (🌻)', type: 'number', min: 0, required: true },
    { key: 'exp', label: 'EXP nhận được', type: 'number', min: 0, required: true },
    { key: 'rarity', label: 'Độ hiếm', type: 'select', options: ['thuong', 'hiem', 'sieu-hiem'] },
    { key: 'disabled', label: 'Tạm khoá', type: 'boolean' },
  ],
};
