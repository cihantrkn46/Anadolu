export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeApiKey(raw) {
  return String(raw).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 128);
}

export function sanitizeInput(raw) {
  return String(raw)
    .replace(/[<>"\\]/g, '')
    .replace(/[\r\n]/g, ' ')
    .trim()
    .slice(0, 30);
}

const ALLOWED_TAGS = new Set(['p', 'strong', 'em', 'code', 'pre', 'h3', 'ul', 'ol', 'li', 'br']);

export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          const text = doc.createTextNode(child.textContent);
          child.replaceWith(text);
          return;
        }
        [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
        walk(child);
      }
    });
  }
  walk(doc.body);
  return doc.body.innerHTML;
}
