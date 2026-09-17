// Vật phẩm cửa hàng mặc định khi registry Firestore "shopItems" chưa có
// dữ liệu. Chủ nhà quản lý qua Owner Console → Shop Master.
export const DEFAULT_SHOP_ITEMS = [
  { id: 'non-la', name: 'Nón Lá Bé Xinh', image: 'items/non-la.svg', price: 50, currency: 'coin', stock: 0, rarity: 'thuong' },
  { id: 'khan-quang', name: 'Khăn Quàng Ấm Áp', image: 'items/khan-quang.svg', price: 80, currency: 'coin', stock: 0, rarity: 'thuong' },
  { id: 'binh-tuoi', name: 'Bình Tưới Cây Thần Kỳ', image: 'items/binh-tuoi.svg', price: 120, currency: 'coin', stock: 0, rarity: 'hiem' },
  { id: 'phan-bon', name: 'Phân Bón Hữu Cơ', image: 'items/phan-bon.svg', price: 60, currency: 'coin', stock: 0, rarity: 'thuong' },
  { id: 'long-den', name: 'Lồng Đèn May Mắn', image: 'items/long-den.svg', price: 15, currency: 'gem', stock: 10, rarity: 'hiem' },
  { id: 'tui-mu', name: 'Túi Mù Bí Ẩn', image: 'items/tui-mu.svg', price: 25, currency: 'gem', stock: 5, rarity: 'sieu-hiem' },
];
