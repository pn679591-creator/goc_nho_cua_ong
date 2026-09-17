export default {
  registry: 'shopItems',
  label: 'Vật phẩm cửa hàng',
  icon: '🛒',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên vật phẩm', type: 'text', required: true },
    { key: 'image', label: 'Ảnh (assets/images/...)', type: 'image', required: true },
    { key: 'price', label: 'Giá', type: 'number', min: 0, required: true },
    { key: 'currency', label: 'Loại tiền', type: 'select', options: ['coin', 'gem', 'ticket'] },
    { key: 'stock', label: 'Kho (0 = không giới hạn)', type: 'number', min: 0 },
    { key: 'soldCount', label: 'Đã bán', type: 'number', min: 0 },
    { key: 'rarity', label: 'Độ hiếm', type: 'select', options: ['thuong', 'hiem', 'sieu-hiem'] },
    { key: 'flashSaleEndAt', label: 'Flash sale kết thúc (ISO datetime)', type: 'text' },
    { key: 'disabled', label: 'Tạm khoá', type: 'boolean' },
  ],
};
