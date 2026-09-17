# Góc Nhỏ Của Ong — Master Design Spec

## Bối cảnh
Repository này bắt đầu **trống** (chỉ có `README.md` và file yêu cầu). Vì vậy đây là
việc **xây dựng mới** một website tĩnh hoàn chỉnh theo đúng kiến trúc/yêu cầu của các
prompt G1 (site tĩnh cho GitHub Pages), G2 (Tarot: 1 lượt = 1 lá), và G3 (Owner Console
toàn quyền) — chứ không phải "chuyển đổi" từ một site cũ đã tồn tại.

## Ngăn xếp công nghệ
- **Không build step**: HTML/CSS/JS thuần (ES modules), không npm/bundler/TypeScript/JSX
  ở phần được publish. Mở trực tiếp qua GitHub Pages là chạy được.
- **Định tuyến**: hash router tự viết (`js/router.js`) — `#/`, `#/farm`, `#/arcade/<id>`,
  `#/tarot`, `#/bots/<id>`, `#/quan-tri/<section>`... Refresh trang không bao giờ 404 nhờ
  `404.html` chuyển hướng về `index.html` giữ nguyên hash.
- **Vòng đời trang**: mỗi trang export `mount(container, { params, query, scope })` và
  `destroy()`. `js/core/lifecycle.js` cấp một "scope" (AbortController + registry timer/
  raf/audio/Firestore-unsubscribe) cho mỗi lần mount — điều hướng đi luôn dọn sạch.
- **Dữ liệu**: Firebase (Auth ẩn danh + Google, Firestore, Storage) nạp từ CDN chính thức
  dưới dạng ES module, phiên bản pin cứng trong `js/config/firebase-config.js`.
- **Bảo mật**: toàn bộ nằm ở Firestore/Storage Security Rules (`firebase/*.rules`), không
  phải ẩn nút trên UI. Hai chế độ `SECURITY_MODE`: `simple` (transaction phía client,
  chạy được với gói miễn phí) và `secure` (Cloud Functions trong `/functions`, tuỳ chọn).

## Cấu trúc thư mục
```
index.html, 404.html, .nojekyll, manifest.webmanifest, sw.js
css/            base, theme, layout, components, games + css/pages/*.css theo trang
js/
  app.js        boot, đăng nhập ẩn danh, đăng ký route, header/nav/wallet/emergency-banner
  router.js     hash router
  config/       app-config, firebase-config, game-balance, economy
  core/         firebase, auth, db, store, events, audio, anim, ui, dialog, toast, images, lifecycle
  pages/        1 module/trang (home, farm, arcade, game-play, shop, tarot, bots,
                bot-detail, profile, admin, not-found)
  features/     farm/, shop/, tarot/, bots/, admin/ (schemas + sections + registry-editor)
  games/        1 thư mục/game, cùng interface createGame() — xem js/games/README.md
assets/         ảnh/âm thanh công khai (SVG placeholder, kebab-case, thay bằng ảnh thật khi cần)
firebase/       firestore.rules, storage.rules, firestore.indexes.json
functions/      Cloud Functions cho SECURITY_MODE="secure" (tuỳ chọn)
spec/           tài liệu này, FEATURE_PARITY.md, BALANCE.md
```

## Các quyết định kiến trúc chính
- **Registry nội dung không giới hạn cứng**: `games`, `crops`, `seeds`, `shopItems`,
  `tarotDeck`, `events`, `bots`, `quests`, `achievements` là các collection Firestore mà
  Owner Console quản lý qua một engine CRUD chung (`js/features/admin/registry-editor.js`)
  dựng UI từ file mô tả schema (`js/features/admin/schemas/*.js`). Thêm loại nội dung mới
  = thêm 1 file schema, không phải sửa code UI.
- **Dữ liệu mặc định + Firestore ghi đè**: mỗi trang có một bộ dữ liệu mặc định cục bộ
  (`js/features/<x>/default-*.js`) để site chạy được ngay cả khi Firestore trống/chưa kết
  nối; khi Firestore có dữ liệu, nó merge đè lên (theo `id`), tài liệu có `disabled: true`
  bị ẩn.
- **Thưởng chỉ nhận đúng 1 lần**: `gameRuns/{runId}` đi qua `playing → finished → claimed`;
  `claimGameReward()` (`js/core/db.js`) chạy trong 1 Firestore transaction, rules chặn claim
  2 lần hoặc claim khi chưa `finished`.
- **Tarot 1 lượt = 1 lá** (chi tiết ở dưới) là ràng buộc cứng xuyên suốt toàn bộ tính năng
  Tarot, không chỉ là một bản vá riêng lẻ.
- **Game shell dùng chung**: `js/games/shared/game-shell.js` xử lý toàn bộ máy trạng thái
  TITLE→READY→PLAYING⇄PAUSED→GAME_OVER→RESULT→REWARD, HUD, pause khi đổi tab, và luồng
  nhận thưởng — mỗi game chỉ cần lo phần chơi (`createGame()`), không tự đụng vào các bước
  còn lại.

## Tarot — 1 lượt = 1 lá (nguyên tắc thiết kế, không phải bản vá thêm)
- State: `{ status: 'idle'|'drawing'|'revealed', currentCard: null | {id, orientation,
  drawnAt}, drawToken }` — `currentCard` LUÔN là một object hoặc null, không bao giờ mảng.
- `drawOneCard()` (`js/features/tarot/tarot-state.js`) là hàm DUY NHẤT được chọn bài; bỏ
  qua ngay nếu đang `drawing`; mỗi lần gọi tăng `drawToken` — mọi callback bất đồng bộ
  (đọc text luận giải, ghi Firestore) đều kiểm tra token trước khi áp dụng kết quả.
- UI luôn `replaceChildren()` khu vực kết quả, không bao giờ `appendChild`/`innerHTML +=`.
- Lịch sử Tarot là một khu vực RIÊNG (`.tarot-history`), tách biệt hoàn toàn khỏi khu vực
  kết quả hiện tại.

## Owner Console — nguyên tắc
- Vai trò `owner` (danh sách UID trong `OWNER_UIDS`) và `admin` (tài liệu `roles/{uid}`
  với `perms[]` do chủ nhà cấp) — kiểm tra ở cả UI (`js/core/auth.js`) lẫn Security Rules.
- Mọi thay đổi ghi `auditLogs` trong CÙNG một batched write (`js/core/db.js#writeAuditLog`).
- Emergency flags (`settings/public.flags`) mọi client lắng nghe realtime, hiện banner mềm,
  và Security Rules chặn ghi tương ứng khi cờ bật.
- Chế độ thử (`?test=1`, chỉ chủ nhà) không đụng ví/leaderboard thật — được `game-shell.js`
  đảm bảo bằng cách không bao giờ gọi `claimGameReward()` trong chế độ này.

## Giới hạn đã biết của bản build này
Xem `spec/FEATURE_PARITY.md` để biết phần nào đã xong đầy đủ, phần nào mới ở mức khung sườn
có thể mở rộng thêm (VD: Spawn/Steal/Leaderboard/Cooldown Master mới có UI điều khiển cơ
bản qua cờ cấu hình, chưa có game logic ăn trộm/PvP đầy đủ chạy trên client).
