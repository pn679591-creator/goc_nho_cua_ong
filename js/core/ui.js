// Tiện ích dựng DOM nhỏ gọn, không phụ thuộc framework.

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (typeof value === 'boolean') {
      if (value) el.setAttribute(key, '');
    } else {
      el.setAttribute(key, value);
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
}

export function formatNumber(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function balancedImg({ src, alt, width, height, fit = 'cover', focus = 'center', lazy = true }) {
  return h('img', {
    src,
    alt: alt || '',
    width,
    height,
    loading: lazy ? 'lazy' : 'eager',
    decoding: 'async',
    class: `bimg bimg--${fit}`,
    style: focus ? `object-position:${focus}` : '',
  });
}
