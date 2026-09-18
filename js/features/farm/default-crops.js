// Cây trồng mặc định khi registry Firestore "crops" chưa có dữ liệu.
// Chủ nhà quản lý qua Owner Console → Farm Master (thêm/sửa/xoá tự do,
// không giới hạn số lượng).
export const DEFAULT_CROPS = [
  { id: 'ca-rot', name: 'Cà Rốt', image: 'crops/ca-rot.svg', growSeconds: 60, sellPrice: 8, exp: 4, rarity: 'thuong' },
  { id: 'dau-tay', name: 'Dâu Tây', image: 'crops/dau-tay.svg', growSeconds: 180, sellPrice: 20, exp: 10, rarity: 'thuong' },
  { id: 'huong-duong', name: 'Hướng Dương', image: 'crops/huong-duong.svg', growSeconds: 300, sellPrice: 30, exp: 15, rarity: 'hiem' },
  { id: 'bi-ngo', name: 'Bí Ngô', image: 'crops/bi-ngo.svg', growSeconds: 420, sellPrice: 40, exp: 20, rarity: 'hiem' },
  { id: 'nho', name: 'Nho', image: 'crops/nho.svg', growSeconds: 600, sellPrice: 60, exp: 28, rarity: 'hiem' },
  { id: 'ngo', name: 'Ngô', image: 'crops/ngo.svg', growSeconds: 240, sellPrice: 24, exp: 12, rarity: 'thuong' },
  { id: 'dua-hau', name: 'Dưa Hấu', image: 'crops/dua-hau.svg', growSeconds: 900, sellPrice: 90, exp: 40, rarity: 'sieu-hiem' },
  { id: 'hoa-hong', name: 'Hoa Hồng', image: 'crops/hoa-hong.svg', growSeconds: 720, sellPrice: 75, exp: 35, rarity: 'sieu-hiem' },
];

export const FARM_PLOT_COUNT = 9;
