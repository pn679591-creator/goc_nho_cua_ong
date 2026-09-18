// Cấu hình Firebase Web SDK. Các giá trị này AN TOÀN khi công khai trong
// repository — bảo mật thật sự nằm ở Firebase Security Rules
// (firebase/firestore.rules, firebase/storage.rules), không phải ở việc
// giấu các khoá này.
//
// Cách lấy: Firebase Console → Project settings → General → "Your apps"
// → Web app → SDK setup and configuration → Config.

export const firebaseConfig = {
  apiKey: 'DÁN_API_KEY_CỦA_BẠN',
  authDomain: 'DÁN_PROJECT_ID.firebaseapp.com',
  projectId: 'DÁN_PROJECT_ID',
  storageBucket: 'DÁN_PROJECT_ID.appspot.com',
  messagingSenderId: 'DÁN_SENDER_ID',
  appId: 'DÁN_APP_ID',
};

// Phiên bản Firebase JS SDK dùng chung cho toàn bộ site (pin cứng để
// tránh lệch phiên bản giữa các module). Sửa ở một chỗ duy nhất này.
export const FIREBASE_SDK_VERSION = '10.12.2';
