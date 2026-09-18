# 🐝 Góc Nhỏ Của Ong

Website tĩnh (HTML/CSS/JS thuần, không cần build) cho GitHub Pages: nông trại, khu vui
chơi (11 minigame), cửa hàng, Tarot, Bạn Ong, hồ sơ, và Bảng Điều Khiển Chủ Nhà.

## 1. Yêu cầu
- Một tài khoản GitHub.
- Một project Firebase (miễn phí là đủ để chạy `SECURITY_MODE = "simple"`).

## 2. Tạo repository & tải code lên GitHub
1. Trên GitHub, tạo một repository mới (public), ví dụ `goc-nho-cua-ong`.
2. Tải toàn bộ nội dung thư mục này lên repository đó (qua `git push` hoặc kéo-thả trên
   giao diện web). Giữ nguyên cấu trúc thư mục.
3. Đảm bảo file `.nojekyll` ở thư mục gốc được tải lên (một số cách kéo-thả bỏ qua file
   bắt đầu bằng dấu chấm — kiểm tra lại bằng `git status` nếu tải qua dòng lệnh).

## 3. Bật GitHub Pages
1. Vào repository → **Settings → Pages**.
2. Mục **Build and deployment** → **Source**: chọn **Deploy from a branch**.
3. **Branch**: chọn `main` (hoặc nhánh bạn vừa đẩy code lên), thư mục **/ (root)**.
4. Lưu lại. Sau 1-2 phút, site sẽ chạy tại `https://<tên-github-của-bạn>.github.io/<tên-repo>/`.

## 4. Tạo project Firebase
1. Vào [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Trong project, vào **Build → Authentication → Get started**, bật hai phương thức đăng
   nhập: **Anonymous** và **Google**.
3. Vào **Build → Firestore Database → Create database** (chọn chế độ **Production**).
4. Vào **Build → Storage → Get started**.
5. Vào **Project settings → General → Your apps → Web app (</>) → đăng ký app mới**, sao
   chép object cấu hình (`apiKey`, `authDomain`, `projectId`, ...).

## 5. Dán cấu hình Firebase vào code
Mở `js/config/firebase-config.js`, dán các giá trị vừa copy vào `firebaseConfig`. Ví dụ:
```js
export const firebaseConfig = {
  apiKey: 'AIzaSy...',
  authDomain: 'goc-nho-cua-ong.firebaseapp.com',
  projectId: 'goc-nho-cua-ong',
  storageBucket: 'goc-nho-cua-ong.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};
```
Commit và đẩy thay đổi này lên GitHub (Pages sẽ tự cập nhật sau ít phút).

## 6. Thêm domain GitHub Pages vào danh sách được phép đăng nhập
1. Firebase Console → **Authentication → Settings → Authorized domains**.
2. Bấm **Add domain**, nhập `<tên-github-của-bạn>.github.io`.

## 7. Đặt UID chủ nhà (Owner)
1. Mở site đã publish, vào **Hồ sơ → Đăng nhập với Google** một lần bằng tài khoản bạn
   muốn làm chủ nhà.
2. Vào Firebase Console → **Authentication → Users**, copy cột **User UID** của tài khoản
   đó.
3. Mở `js/config/app-config.js`, dán UID vào mảng `OWNER_UIDS`:
   ```js
   export const OWNER_UIDS = ['UID_BẠN_VỪA_COPY'];
   ```
4. Mở `firebase/firestore.rules` và `firebase/storage.rules`, dán CÙNG UID đó vào các hàm
   `isOwner()` (thay chỗ có comment `'DÁN_UID_CHỦ_NHÀ_VÀO_ĐÂY'`).
5. Commit + đẩy lên GitHub, và publish lại rules (bước 8).

## 8. Publish Firestore & Storage Security Rules
Cách dễ nhất — dán trực tiếp trên Firebase Console:
1. **Firestore Database → Rules** → dán nội dung file `firebase/firestore.rules` → **Publish**.
2. **Storage → Rules** → dán nội dung file `firebase/storage.rules` → **Publish**.
3. **Firestore Database → Indexes** → tạo các composite index theo `firebase/firestore.indexes.json`
   (Firestore cũng sẽ tự gợi ý link tạo index khi một truy vấn thiếu index, trong Console
   của trình duyệt lúc chạy thử site).

Hoặc dùng Firebase CLI (nếu bạn quen dòng lệnh):
```bash
npm install -g firebase-tools
firebase login
# Sửa .firebaserc, thay DÁN_PROJECT_ID_VÀO_ĐÂY bằng project id thật
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

## 9. Chọn chế độ bảo mật (Simple / Secure)
Mặc định `js/config/app-config.js` có `SECURITY_MODE = 'simple'` — chạy đầy đủ với gói
Firebase miễn phí, không cần deploy Cloud Functions.

Muốn nâng cấp lên `secure` (server tính thưởng/ăn trộm/Tarot thay vì client):
```bash
cd functions
npm install
firebase functions:secrets:set GEMINI_API_KEY   # tuỳ chọn, chỉ cần cho AI Tarot/thư
firebase deploy --only functions
```
Sau đó đổi `SECURITY_MODE: 'secure'` trong `js/config/app-config.js` và trỏ
`AI_PROXY_URL` tới URL function `aiProxy` vừa deploy (nếu muốn dùng luận giải AI thay vì
văn bản dự phòng có sẵn).

## 10. Cập nhật site sau này
- Mỗi khi sửa CSS/JS, tăng số phiên bản `APP_VERSION` trong `js/config/app-config.js`
  (dùng để chống cache cũ — `?v=<APP_VERSION>` gắn sau các file CSS/JS trong `index.html`).
- Commit + push lên nhánh đang deploy — GitHub Pages tự build lại sau 1-2 phút.
- Thay đổi nội dung game (crops, shop, Tarot, events...) thì **không cần** deploy lại — vào
  thẳng `#/quan-tri` (Bảng Điều Khiển Chủ Nhà) và sửa, có hiệu lực ngay cho mọi người chơi.

## Cấu trúc thư mục
Xem chi tiết tại `spec/MASTER_DESIGN_SPEC.md`. Trạng thái từng tính năng: `spec/FEATURE_PARITY.md`.
Bảng cân bằng độ khó/kinh tế: `spec/BALANCE.md`. Quy ước viết game mới: `js/games/README.md`.

## Ảnh & âm thanh
Repo hiện dùng ảnh SVG placeholder (đặt tại `assets/images/`) để mọi khung ảnh, minigame,
và Owner Console chạy được ngay không cần chờ thiết kế. Thay bằng ảnh/âm thanh thật bằng
cách: (1) đổi trực tiếp file SVG cùng tên, hoặc (2) vào Owner Console → Asset Manager để
tải ảnh mới lên Firebase Storage và cập nhật đường dẫn trong registry tương ứng.

## Không có gì bí mật trong repository
Kiểm tra lại trước khi commit: không có API key Gemini, không có mật khẩu Rèm Nhung, không
có token quản trị nào trong code. `js/config/firebase-config.js` AN TOÀN để công khai — bảo
mật thật sự nằm ở `firebase/firestore.rules` và `firebase/storage.rules`.
