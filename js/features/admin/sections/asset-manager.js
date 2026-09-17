import { h } from '../../../core/ui.js';
import { subscribeCollection, upsertRegistryDoc, deleteRegistryDoc } from '../../../core/db.js';
import { storage, fbStorage } from '../../../core/firebase.js';
import { showToast } from '../../../core/toast.js';
import { confirmDangerous } from '../../../core/dialog.js';

const { ref, uploadBytes, getDownloadURL, deleteObject } = fbStorage;

export function mountAssetManager(container, scope) {
  container.append(h('h2', {}, '🖼️ Quản lý ảnh (Asset Manager)'));
  const uploadCard = h('div', { class: 'card' });
  const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true });
  const nameHint = h('p', { class: 'field-hint' }, 'Ảnh được tải lên Firebase Storage tại đường dẫn assets-uploaded/<tên file>. Ảnh riêng tư 18+ KHÔNG được tải ở đây — dùng khu vực Rèm Nhung riêng.');
  uploadCard.append(h('h3', {}, 'Tải ảnh lên'), fileInput, nameHint);
  container.append(uploadCard);

  const grid = h('div', { class: 'grid grid--bots', style: 'margin-top:var(--space-4)' });
  container.append(grid);

  let assets = [];
  function render() {
    grid.replaceChildren(...assets.map((a) => h('div', { class: 'card' }, [
      h('img', { src: a.url, alt: a.id, style: 'width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px' }),
      h('p', { style: 'font-size:12px;word-break:break-all' }, a.id),
      h('button', { class: 'btn btn--danger btn--small', onClick: () => removeAsset(a) }, 'Xoá'),
    ])));
  }

  fileInput.addEventListener('change', async () => {
    for (const file of fileInput.files) {
      try {
        const path = `assets-uploaded/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await upsertRegistryDoc('assets', null, { path, url, uploadedAt: Date.now() }, { action: 'upload_asset' });
        showToast(`Đã tải lên "${file.name}".`, { type: 'success' });
      } catch (err) {
        showToast(`Lỗi tải "${file.name}": ${err.message}`, { type: 'error' });
      }
    }
    fileInput.value = '';
  });

  async function removeAsset(asset) {
    const ok = await confirmDangerous({ title: 'Xoá ảnh', message: `Xoá vĩnh viễn "${asset.id}"? Kiểm tra danh sách sử dụng trước khi xoá.` });
    if (!ok) return;
    try {
      if (asset.path) await deleteObject(ref(storage, asset.path));
    } catch { /* file có thể đã bị xoá thủ công */ }
    await deleteRegistryDoc('assets', asset.id, asset);
    showToast('Đã xoá ảnh.', { type: 'success' });
  }

  const unsub = subscribeCollection('assets', (docs) => { assets = docs; render(); });
  scope.trackUnsubscribe(unsub);

  return { destroy() {} };
}
