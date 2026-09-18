// Danh sách minigame. Thêm game mới: viết js/games/<id>/game.js theo đúng
// interface (xem README trong thư mục js/games/) rồi thêm một dòng ở đây.
export const GAME_REGISTRY = [
  { id: 'san-hat', label: 'Hamster Săn Hạt', icon: '🌻', cover: 'games/san-hat.svg', loader: () => import('./san-hat/game.js') },
  { id: 'hung-qua-roi', label: 'Hứng Quả Rơi', icon: '🍎', cover: 'games/hung-qua-roi.svg', loader: () => import('./hung-qua-roi/game.js') },
  { id: 'lat-the', label: 'Lật Thẻ Ghép Đôi', icon: '🃏', cover: 'games/lat-the.svg', loader: () => import('./lat-the/game.js') },
  { id: 'nhay-may', label: 'Hamster Nhảy Mây', icon: '☁️', cover: 'games/nhay-may.svg', loader: () => import('./nhay-may/game.js') },
  { id: 'ghep-hat', label: 'Ghép Hạt Ngọt', icon: '🍬', cover: 'games/ghep-hat.svg', loader: () => import('./ghep-hat/game.js') },
  { id: 'dap-sau', label: 'Đập Sâu Vườn', icon: '🐛', cover: 'games/dap-sau.svg', loader: () => import('./dap-sau/game.js') },
  { id: 'cau-ca', label: 'Câu Cá Ao Hồng', icon: '🎣', cover: 'games/cau-ca.svg', loader: () => import('./cau-ca/game.js') },
  { id: 'chay-banh-xe', label: 'Hamster Chạy Bánh Xe', icon: '🎡', cover: 'games/chay-banh-xe.svg', loader: () => import('./chay-banh-xe/game.js') },
  { id: 'caro-hat-dua', label: 'Caro Hạt Dưa', icon: '⭕', cover: 'games/caro-hat-dua.svg', loader: () => import('./caro-hat-dua/game.js') },
  { id: 'dua-hamster', label: 'Đua Hamster', icon: '🏁', cover: 'games/dua-hamster.svg', loader: () => import('./dua-hamster/game.js') },
  { id: 'do-vui', label: 'Đố Vui Nhà Ong', icon: '❓', cover: 'games/do-vui.svg', loader: () => import('./do-vui/game.js') },
];

export function getGameMeta(id) {
  return GAME_REGISTRY.find((g) => g.id === id) || null;
}
