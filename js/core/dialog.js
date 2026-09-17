import { h } from './ui.js';

/** Hộp thoại xác nhận chung. resolve(true) khi đồng ý, resolve(false) khi huỷ. */
export function confirmDialog({ title = 'Xác nhận', message = '', confirmText = 'Đồng ý', cancelText = 'Huỷ', danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = h('div', { class: 'dialog-overlay' });
    const close = (result) => {
      overlay.remove();
      document.body.classList.remove('no-scroll');
      resolve(result);
    };
    const box = h('div', { class: 'dialog-box', role: 'alertdialog', 'aria-modal': 'true' }, [
      h('h3', { class: 'dialog-title' }, title),
      h('p', { class: 'dialog-message' }, message),
      h('div', { class: 'dialog-actions' }, [
        h('button', { class: 'btn btn--ghost', onClick: () => close(false) }, cancelText),
        h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, onClick: () => close(true) }, confirmText),
      ]),
    ]);
    overlay.append(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    document.body.append(overlay);
    document.body.classList.add('no-scroll');
  });
}

/** Xác nhận hành động phá huỷ bằng cách gõ đúng từ "XÁC NHẬN". */
export function confirmDangerous({ title = 'Hành động nguy hiểm', message = '' } = {}) {
  return new Promise((resolve) => {
    const overlay = h('div', { class: 'dialog-overlay' });
    const input = h('input', { class: 'input', type: 'text', placeholder: 'Gõ XÁC NHẬN' });
    const err = h('p', { class: 'dialog-error', style: 'display:none' }, 'Bạn cần gõ đúng "XÁC NHẬN" để tiếp tục.');
    const close = (result) => {
      overlay.remove();
      document.body.classList.remove('no-scroll');
      resolve(result);
    };
    const confirmBtn = h('button', { class: 'btn btn--danger', onClick: () => {
      if (input.value.trim() === 'XÁC NHẬN') close(true);
      else err.style.display = 'block';
    } }, 'Xác nhận');
    const box = h('div', { class: 'dialog-box', role: 'alertdialog', 'aria-modal': 'true' }, [
      h('h3', { class: 'dialog-title' }, title),
      h('p', { class: 'dialog-message' }, message),
      input,
      err,
      h('div', { class: 'dialog-actions' }, [
        h('button', { class: 'btn btn--ghost', onClick: () => close(false) }, 'Huỷ'),
        confirmBtn,
      ]),
    ]);
    overlay.append(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    document.body.append(overlay);
    document.body.classList.add('no-scroll');
    input.focus();
  });
}

export function openModal(contentEl, { onClose } = {}) {
  const overlay = h('div', { class: 'dialog-overlay dialog-overlay--modal' });
  const close = () => {
    overlay.remove();
    document.body.classList.remove('no-scroll');
    onClose?.();
  };
  const box = h('div', { class: 'dialog-box dialog-box--wide' }, [
    h('button', { class: 'dialog-close', 'aria-label': 'Đóng', onClick: close }, '✕'),
    contentEl,
  ]);
  overlay.append(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.append(overlay);
  document.body.classList.add('no-scroll');
  return close;
}
