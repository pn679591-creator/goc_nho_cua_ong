# Bảng đối chiếu tính năng (Feature Parity)

> Ghi chú quan trọng: repository này **bắt đầu trống** — không có website "Góc Nhỏ Của
> Ong" nào tồn tại từ trước để "chuyển đổi". Vì vậy bảng dưới đây là **bảng trạng thái xây
> dựng mới** theo đúng yêu cầu của 3 prompt (G1 site tĩnh, G2 fix Tarot, G3 Owner Console),
> không phải một danh sách kiểm tra tính năng bị mất khi chuyển đổi.

Chú thích: ✅ Hoàn chỉnh · 🟡 Có khung/hoạt động được, còn có thể mở rộng thêm · ⬜ Chưa làm

## Hạ tầng & trang chính
| Tính năng | Trạng thái | File |
|---|---|---|
| Hash router, 404→index không mất route | ✅ | `js/router.js`, `404.html` |
| Vòng đời trang (mount/destroy, dọn sạch listener/timer/raf) | ✅ | `js/core/lifecycle.js`, mọi `js/pages/*.js` |
| Đăng nhập ẩn danh + Google | ✅ | `js/core/auth.js` |
| Header: nav, ví, banner khẩn cấp, admin link | ✅ | `js/app.js`, `index.html` |
| Trang chủ / Lobby | ✅ | `js/pages/home.js` |
| Nông trại: trồng/thu hoạch theo mốc thời gian thật | ✅ | `js/pages/farm.js` |
| Cửa hàng: mua vật phẩm bằng transaction | ✅ | `js/pages/shop.js` |
| Bạn Ong (danh sách + chi tiết) | ✅ | `js/pages/bots.js`, `bot-detail.js` |
| Hồ sơ người chơi | ✅ | `js/pages/profile.js` |
| PWA: manifest, service worker cache | ✅ | `manifest.webmanifest`, `sw.js` |
| Ảnh cân đối (aspect-ratio, object-fit, lazy, alt tiếng Việt) | ✅ | `css/layout.css`, `js/core/ui.js`, `images.js` |
| Companion / Kitchen / House / Market / Notifications / Gallery nâng cao | ⬜ | Thư mục `js/features/*` đã tạo sẵn, chưa có trang riêng — có thể bổ sung sau theo đúng mẫu các trang hiện có |

## Tarot (G2 — 1 lượt = 1 lá)
| Yêu cầu | Trạng thái |
|---|---|
| State `{status, currentCard, drawToken}`, `currentCard` không bao giờ là mảng | ✅ |
| `drawOneCard()` là hàm duy nhất chọn bài, chặn gọi trùng khi đang `drawing` | ✅ |
| Render bằng `replaceChildren`, không `appendChild`/`innerHTML +=` | ✅ |
| Lật bài 1 phần tử `.tarot-card` với `backface-visibility` | ✅ |
| Callback bất đồng bộ kiểm tra `drawToken` trước khi áp dụng | ✅ |
| Nút "Rút bài" khoá khi đang rút, chống double-tap | ✅ |
| Ghi `tarotReadings` với id tạo trước khi ghi (client-generated) | ✅ |
| "Lá bài hôm nay" giới hạn 1 lần/ngày (Việt Nam) | ✅ (client check + rule chặn tạo đè) |
| Lịch sử tách biệt khỏi khu vực kết quả | ✅ |

## Owner Console (G3)
| Mục | Trạng thái | Ghi chú |
|---|---|---|
| Vai trò owner/admin, `roles/{uid}`, `hasPerm()` | ✅ | `js/core/auth.js` |
| Registry engine dựa trên schema (không giới hạn cứng) | ✅ | `js/features/admin/registry-editor.js` + `schemas/*.js` |
| Game Master (bật/tắt, ghi đè cân bằng) | ✅ | registry `games` |
| Farm Master (crops + seeds CRUD) | ✅ | registry `crops`, `seeds` — Instant Grow/Harvest chưa có nút riêng (đã có transaction thu hoạch chuẩn) |
| Shop Master (CRUD, giá, kho) | ✅ | registry `shopItems` — Flash Sale mới có field `flashSaleEndAt`, chưa có countdown UI riêng |
| Tarot Master (CRUD bộ bài) | ✅ | registry `tarotDeck` |
| Event Master (CRUD sự kiện) | ✅ | registry `events` |
| Content Master (bots/quests/achievements) | ✅ | registries tương ứng |
| Owner inventory (cộng tiền/vật phẩm cho bản thân) | ✅ | `sections/owner-inventory.js` |
| Test Mode (sandbox, badge, không đụng ví thật) | ✅ | `?test=1` trong `js/games/shared/game-shell.js` — chưa có ví sandbox `testSandbox/{uid}` riêng vì free-play không ghi Firestore |
| Economy Master (hệ số nhân + giới hạn + preview) | ✅ | `sections/economy.js` |
| Emergency Mode (7 cờ, banner realtime, rules chặn) | ✅ | `sections/emergency.js` |
| User Control (tìm, cộng/trừ ví, khoá/cấm) | ✅ | `sections/user-control.js` |
| Asset Manager (upload/xoá qua Storage) | ✅ | `sections/asset-manager.js` |
| Audit Log (lọc, xuất CSV) | ✅ | `sections/audit-log.js` |
| Debug panel | ✅ | `sections/debug.js` |
| Overview dashboard (đếm nhanh) | ✅ | `sections/overview.js` |
| Cooldown / Steal / Spawn / Leaderboard Master | 🟡 | `sections/operations.js` — có UI ghi cấu hình + nút hành động (reset/force), NHƯNG cơ chế ăn trộm/PvP và spawn ngẫu nhiên đầy đủ trên client CHƯA được lập trình (mới có Cloud Function mẫu `stealAttempt`) |
| Xác nhận gõ "XÁC NHẬN" cho thao tác phá huỷ | ✅ | `js/core/dialog.js#confirmDangerous` |
| Xoá có hoàn tác 10 giây | ✅ | `registry-editor.js#scheduleDelete` |

## Trò chơi (11 game, state machine dùng chung)
Tất cả 11 game dùng chung `js/games/shared/game-shell.js` (state machine đầy đủ
TITLE→READY→PLAYING⇄PAUSED→GAME_OVER→RESULT→REWARD, HUD, pause khi đổi tab, nhận thưởng
1 lần). Danh sách:

| Game | File | Trạng thái |
|---|---|---|
| Hamster Săn Hạt | `js/games/san-hat/game.js` | ✅ (game tham chiếu) |
| Hứng Quả Rơi | `js/games/hung-qua-roi/game.js` | ✅ |
| Lật Thẻ Ghép Đôi | `js/games/lat-the/game.js` | ✅ |
| Hamster Nhảy Mây | `js/games/nhay-may/game.js` | ✅ |
| Ghép Hạt Ngọt | `js/games/ghep-hat/game.js` | ✅ |
| Đập Sâu Vườn | `js/games/dap-sau/game.js` | ✅ |
| Câu Cá Ao Hồng | `js/games/cau-ca/game.js` | ✅ |
| Hamster Chạy Bánh Xe | `js/games/chay-banh-xe/game.js` | ✅ |
| Caro Hạt Dưa (vs AI) | `js/games/caro-hat-dua/game.js` | ✅ |
| Đua Hamster (vs AI) | `js/games/dua-hamster/game.js` | ✅ |
| Đố Vui Nhà Ong | `js/games/do-vui/game.js` | ✅ |

Cooldown 15s giữa các lượt chơi có thưởng cùng game: 🟡 chưa gate ở `game-shell.js` (mới có
giới hạn 25 lượt/ngày qua `dailyStats`) — dễ bổ sung bằng cách đọc `finishedAt` lượt gần
nhất trong `gameRuns`.

## Bảo mật (Firebase)
| Mục | Trạng thái |
|---|---|
| `firestore.rules` (owner/admin, wallet có trần delta, gameRuns 1-lần-claim, Tarot 1-lần/ngày) | ✅ |
| `storage.rules` (public / assets-uploaded / velvet-private / avatars) | ✅ |
| `firestore.indexes.json` | ✅ |
| Rèm Nhung (Velvet Curtain) — hash password qua `get()`, không lộ hash | ✅ (rules) — chưa có trang UI nhập mật khẩu riêng, có thể thêm `js/pages/velvet.js` theo mẫu các trang hiện có |
| Cloud Functions chế độ `secure` (claimGameReward, tarotDrawDaily, stealAttempt, aiProxy) | ✅ (tuỳ chọn, site chạy đủ ở chế độ `simple`) |

## Kết luận
Toàn bộ khung sườn, 11 game, Tarot (đúng quy tắc G2), và Owner Console (đúng yêu cầu G3)
đã hoạt động được trên GitHub Pages sau khi điền cấu hình Firebase thật. Các mục 🟡 là nơi
có thể mở rộng thêm mà không cần đổi kiến trúc — chủ yếu là các cơ chế PvP/spawn ngẫu
nhiên nâng cao chưa được lập trình đầy đủ trên client do giới hạn thời gian xây dựng.
