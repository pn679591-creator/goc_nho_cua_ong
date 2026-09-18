// Cấu hình chung cho toàn bộ ứng dụng "Góc Nhỏ Của Ong".
// Sửa các giá trị dưới đây khi triển khai lên GitHub Pages / Firebase thật.

export const APP_VERSION = '1.0.0';

export const APP_NAME = 'Góc Nhỏ Của Ong';

// "simple"  = mọi hành động kinh tế chạy bằng Firestore transaction phía client
//             (dùng được với gói Firebase miễn phí, không cần Cloud Functions).
// "secure"  = các hành động nhạy cảm (roll thưởng, ăn trộm, mở túi mù, restock...)
//             gọi Cloud Functions trong thư mục /functions.
export const SECURITY_MODE = 'simple';

// UID của chủ nhà (Ong). Phải khớp với danh sách OWNER_UIDS trong
// firebase/firestore.rules và firebase/storage.rules.
export const OWNER_UIDS = [
  // 'DÁN_UID_CHỦ_NHÀ_VÀO_ĐÂY',
];

// URL Cloud Function (hoặc endpoint tương đương) dùng để sinh văn bản AI
// (bói Tarot, thư hằng ngày, lời thoại bạn đồng hành). Để trống hoặc lỗi
// mạng sẽ tự động dùng văn bản dự phòng có sẵn trong js/features/tarot,
// js/features/companions... KHÔNG bao giờ gọi Gemini trực tiếp từ trình
// duyệt kèm API key.
export const AI_PROXY_URL = '';

// Đường dẫn gốc tương đối của site (dùng cho router/manifest khi cần).
export const BASE_PATH = './';

export const FEATURE_FLAGS = {
  enableAiProxy: false,
};
