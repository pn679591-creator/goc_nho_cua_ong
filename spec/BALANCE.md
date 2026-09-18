# Cân bằng độ khó & kinh tế

## Mục tiêu cân bằng chung
- Một lượt chơi bình thường kéo dài **60–180 giây**.
- Tỉ lệ thắng/qua màn lần đầu: **~80% ở Dễ, ~50% ở Thường, ~20% ở Khó**.
- Các con số cụ thể theo từng game nằm trong `js/config/game-balance.js` (mặc định)
  và có thể bị ghi đè theo thời gian thực tại `settings/balance.games.<id>` trên
  Firestore (chỉnh qua Owner Console → mục theo từng registry hoặc "Vận hành nâng cao").

## Kinh tế (js/config/economy.js, ghi đè tại settings/balance.economy)
- ⚡ Năng lượng: tối đa 100, hồi 1 điểm mỗi 3 phút (tính theo mốc thời gian
  `energyUpdatedAt`, KHÔNG dùng bộ đếm phía client). Mỗi lượt chơi có thưởng tốn
  6 / 8 / 10 năng lượng theo độ khó Dễ/Thường/Khó. Không đủ năng lượng vẫn chơi được
  ở chế độ "Chơi vui" (không thưởng).
- EXP mỗi lượt: 10 (gốc) + tối đa 30 (theo điểm số) × hệ số độ khó (0.8 / 1 / 1.3).
- 🌻 mỗi lượt: điểm số × 0.5 × hệ số độ khó (0.8 / 1 / 1.4), tối đa 120 / 150 / 200.
- 🍯 mỗi lượt: chỉ khi đạt ≥ 1 sao; 5/10/15 (theo độ khó) + 2 mỗi sao; tối đa 300 🍯/ngày
  (tính tổng mọi game, lưu tại `users/{uid}/dailyStats/{ngày}`).
- 🎟️ Vé: lượt 3 sao được 1 vé, tối đa 3 vé/ngày.
- Giới hạn lượt có thưởng: 25 lượt/game/ngày (0 = không giới hạn). Sau đó tự động
  chuyển "Chơi vui".
- Nhiều người chơi (PvP): người thắng +10 🍯, người thua +3 🍯; tối đa 5 lần thưởng
  cho cùng một đối thủ/ngày.

## Bảng thông số từng game
Xem `js/config/game-balance.js` — mỗi game có object riêng theo id (`san-hat`,
`hung-qua-roi`, `lat-the`, `nhay-may`, `ghep-hat`, `dap-sau`, `cau-ca`,
`chay-banh-xe`, `caro-hat-dua`, `dua-hamster`, `do-vui`) với 3 mức Dễ/Thường/Khó
(`de` / `thuong` / `kho`).

## Cách chủ nhà tinh chỉnh không cần sửa code
1. Vào `#/quan-tri` → mục registry tương ứng (VD: "🎮 Trò chơi") để bật/tắt game,
   ghi đè cooldown/giới hạn/ngày/chi phí năng lượng.
2. Vào "💰 Kinh tế" để chỉnh hệ số nhân thưởng, giá bán, EXP, sự kiện và các giới
   hạn hằng ngày — xem trước ví dụ tác động trước khi lưu.
3. Mọi thay đổi ghi vào `settings/balance` trên Firestore và có hiệu lực NGAY cho
   toàn bộ người chơi đang mở site (không cần deploy lại GitHub Pages).
