# Interface minigame

Mỗi `js/games/<id>/game.js` phải export:

```js
export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  // ...
  return { start, pause, resume, restart, destroy };
}
```

- `canvas`: phần tử `<canvas>` đã có trong DOM (nằm trong `.game-shell__stage`). Dùng
  `fitCanvasToContainer(canvas, canvas.parentElement)` từ `js/core/anim.js` để lấy kích
  thước thật + devicePixelRatio và set kích thước canvas.
- `difficulty`: `'de' | 'thuong' | 'kho'`.
- `config`: object cân bằng của game đó, lấy từ `js/config/game-balance.js` (đã áp
  override từ `settings/balance` nếu chủ nhà chỉnh trong Owner Console). Nó có thể là
  `config['<gameId>']` (khi shell truyền cả object) hoặc chính object cân bằng — luôn
  fallback `config?.['<id>'] || config || {}` để an toàn.
- `testMode`: `true` khi chủ nhà mở bằng `?test=1`. Không bắt buộc game phải xử lý gì
  đặc biệt — shell đã tự sandbox (không trừ năng lượng, không claim thưởng thật).
- `onEnd({ score, stars, durationMs })`: gọi ĐÚNG MỘT LẦN khi ván đấu kết thúc (thắng,
  thua, hết giờ). `score` là số nguyên ≥ 0, `stars` từ 0-3.

Trả về:
- `start()` — bắt đầu vòng lặp game (sau khi shell đã đếm ngược 3-2-1).
- `pause()` / `resume()` — tạm dừng / tiếp tục vòng lặp mà không mất trạng thái.
- `restart()` — chơi lại từ đầu, dùng cùng instance thay vì tạo mới.
- `destroy()` — dọn sạch: dừng vòng lặp, huỷ mọi listener/timer/raf/audio. Phải tự tạo
  một `createLifecycleScope()` riêng (từ `js/core/lifecycle.js`) trong `createGame()` và
  gọi `scope.destroy()` bên trong `destroy()`.

## Quy tắc bắt buộc

- Vòng lặp cập nhật cố định 60 lần/giây (`createFixedStepLoop` trong `js/core/anim.js`),
  vẽ bằng `requestAnimationFrame`.
- Hỗ trợ chạm (tap/kéo/vuốt), chuột, và bàn phím (mũi tên/WASD tối thiểu).
- Không tự ý phát sinh `setInterval`/`addEventListener` ngoài `scope` — mọi thứ phải bị
  huỷ khi `destroy()` chạy.
- Đọc tham số cân bằng từ `config`, KHÔNG hard-code độ khó.
- `js/games/san-hat/game.js` là ví dụ tham chiếu đầy đủ — sao chép cấu trúc từ đó.

## Danh sách game & cơ chế cốt lõi

| id | Tên | Cơ chế |
|---|---|---|
| `san-hat` | Hamster Săn Hạt | Hứng hạt rơi bằng cách di chuyển hamster trái/phải (tham chiếu, đã xong) |
| `hung-qua-roi` | Hứng Quả Rơi | Hứng trái cây rơi bằng giỏ, tránh vật phẩm xấu, có số mạng (lives) |
| `lat-the` | Lật Thẻ Ghép Đôi | Memory match lưới NxN theo độ khó, có giới hạn thời gian ở Thường/Khó |
| `nhay-may` | Hamster Nhảy Mây | Nhảy qua các đám mây (một số vỡ/di chuyển) lên cao dần, kiểu Doodle Jump |
| `ghep-hat` | Ghép Hạt Ngọt | Match-3 hoặc trượt ghép 3 hạt cùng màu trong số nước đi giới hạn |
| `dap-sau` | Đập Sâu Vườn | Whack-a-mole: đập sâu xuất hiện ngẫu nhiên, né hamster con |
| `cau-ca` | Câu Cá Ao Hồng | Thanh bar + vùng bắt cá di chuyển, giữ con trỏ trong vùng bắt |
| `chay-banh-xe` | Hamster Chạy Bánh Xe | Endless runner: nhảy né chướng ngại vật, tốc độ tăng dần theo quãng đường |
| `caro-hat-dua` | Caro Hạt Dưa | Caro/Gomoku 9x9 cần 5 quân liên tiếp, đấu với AI (minimax + chấm điểm) |
| `dua-hamster` | Đua Hamster | Đua tốc độ: tap liên tục để tăng tốc, đua với AI |
| `do-vui` | Đố Vui Nhà Ong | Trắc nghiệm nhiều câu hỏi có giới hạn thời gian mỗi câu |

Thông số cân bằng chi tiết từng game nằm trong `js/config/game-balance.js`.
