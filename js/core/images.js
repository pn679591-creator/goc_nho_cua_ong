// Trợ giúp chọn ảnh có sẵn / ảnh dự phòng khi asset chưa được tải lên.
export const PLACEHOLDER_IMG = './assets/images/placeholder.svg';

export function resolveAssetUrl(assetPathOrUrl) {
  if (!assetPathOrUrl) return PLACEHOLDER_IMG;
  if (/^https?:\/\//.test(assetPathOrUrl) || assetPathOrUrl.startsWith('./') || assetPathOrUrl.startsWith('/')) {
    return assetPathOrUrl;
  }
  return `./assets/images/${assetPathOrUrl}`;
}

export function onImageError(imgEl) {
  imgEl.addEventListener('error', () => {
    if (imgEl.src !== new URL(PLACEHOLDER_IMG, window.location.href).href) {
      imgEl.src = PLACEHOLDER_IMG;
    }
  }, { once: true });
  return imgEl;
}
