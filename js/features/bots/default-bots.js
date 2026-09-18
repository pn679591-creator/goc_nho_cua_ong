// Dữ liệu mặc định cho các Bạn Ong khi Firestore chưa có (hoặc chưa tải)
// registry "bots". Chủ nhà có thể thêm/sửa/xoá qua Owner Console mà không
// cần sửa file này.
export const DEFAULT_BOTS = [
  { id: 'mat-ong', name: 'Mật Ong', tag: 'Vui vẻ', cover: 'bots/mat-ong.svg', bio: 'Chú ong chăm chỉ nhất tổ, lúc nào cũng mang theo nụ cười ngọt như mật.' },
  { id: 'hoa-huong-duong', name: 'Hướng Dương', tag: 'Năng động', cover: 'bots/hoa-huong-duong.svg', bio: 'Luôn hướng về phía mặt trời, thích rủ bạn đi chơi game mỗi buổi sáng.' },
  { id: 'la-non', name: 'Lá Non', tag: 'Nhẹ nhàng', cover: 'bots/la-non.svg', bio: 'Yêu thiên nhiên, giỏi chăm sóc nông trại hơn ai hết.' },
  { id: 'suong-mai', name: 'Sương Mai', tag: 'Mộng mơ', cover: 'bots/suong-mai.svg', bio: 'Thích ngắm bình minh và rút một lá bài Tarot mỗi sáng sớm.' },
  { id: 'trang-ram', name: 'Trăng Rằm', tag: 'Bí ẩn', cover: 'bots/trang-ram.svg', bio: 'Am hiểu Tarot, hay kể chuyện cổ tích lúc đêm khuya.' },
  { id: 'hong-phan', name: 'Hồng Phấn', tag: 'Dịu dàng', cover: 'bots/hong-phan.svg', bio: 'Thích trang trí nông trại bằng những bông hoa hồng nhỏ xinh.' },
  { id: 'cam-nang', name: 'Cam Nắng', tag: 'Rực rỡ', cover: 'bots/cam-nang.svg', bio: 'Người bạn tràn đầy năng lượng, mê chơi Đua Hamster.' },
  { id: 'tim-biec', name: 'Tím Biếc', tag: 'Sâu lắng', cover: 'bots/tim-biec.svg', bio: 'Thích lắng nghe và luôn sẵn sàng an ủi khi bạn buồn.' },
];
