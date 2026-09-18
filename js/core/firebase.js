// Khởi tạo Firebase một lần duy nhất cho toàn bộ site, nạp SDK từ CDN
// chính thức dưới dạng ES module, phiên bản pin cứng trong firebase-config.js.
//
// QUAN TRỌNG: nếu việc tải CDN thất bại (mất mạng tạm thời, trình chặn
// quảng cáo, tường lửa công ty chặn gstatic.com...), module này KHÔNG được
// ném lỗi ra ngoài — vì hầu hết mọi file khác import gián tiếp qua đây, một
// lỗi ở đây sẽ làm toàn bộ app.js không chạy được, kể cả phần điều hướng/
// giao diện không cần Firebase. Thay vào đó, ta xuất ra `null`/stub, và mỗi
// nơi dùng Firebase tự xử lý khi `db`/`auth`/`storage` là null (xem
// `isFirebaseReady()`).
import { firebaseConfig, FIREBASE_SDK_VERSION } from '../config/firebase-config.js';

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

export let app = null;
export let auth = null;
export let db = null;
export let storage = null;
export let fbAuth = {};
export let fbStore = {};
export let fbStorage = {};
let initError = null;

try {
  const [{ initializeApp }, authMod, firestoreMod, storageMod] = await Promise.all([
    import(/* @vite-ignore */ `${CDN}/firebase-app.js`),
    import(/* @vite-ignore */ `${CDN}/firebase-auth.js`),
    import(/* @vite-ignore */ `${CDN}/firebase-firestore.js`),
    import(/* @vite-ignore */ `${CDN}/firebase-storage.js`),
  ]);
  app = initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  db = firestoreMod.getFirestore(app);
  storage = storageMod.getStorage(app);
  fbAuth = authMod;
  fbStore = firestoreMod;
  fbStorage = storageMod;
} catch (err) {
  initError = err;
  console.error(
    '[firebase] Không thể tải Firebase SDK từ CDN. Trang vẫn hiển thị được nhưng các ' +
    'tính năng cần dữ liệu (đăng nhập, ví, nông trại, cửa hàng, Tarot, quản trị...) sẽ ' +
    'không hoạt động cho tới khi tải lại trang với kết nối mạng ổn định. Lỗi gốc:',
    err,
  );
}

export function isFirebaseReady() {
  return !!db;
}

export function getFirebaseInitError() {
  return initError;
}
