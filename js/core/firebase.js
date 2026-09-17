// Khởi tạo Firebase một lần duy nhất cho toàn bộ site, nạp SDK từ CDN
// chính thức dưới dạng ES module, phiên bản pin cứng trong firebase-config.js.
import { firebaseConfig, FIREBASE_SDK_VERSION } from '../config/firebase-config.js';

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

const [{ initializeApp }, authMod, firestoreMod, storageMod] = await Promise.all([
  import(/* @vite-ignore */ `${CDN}/firebase-app.js`),
  import(/* @vite-ignore */ `${CDN}/firebase-auth.js`),
  import(/* @vite-ignore */ `${CDN}/firebase-firestore.js`),
  import(/* @vite-ignore */ `${CDN}/firebase-storage.js`),
]);

export const app = initializeApp(firebaseConfig);
export const auth = authMod.getAuth(app);
export const db = firestoreMod.getFirestore(app);
export const storage = storageMod.getStorage(app);

export const fbAuth = authMod;
export const fbStore = firestoreMod;
export const fbStorage = storageMod;
