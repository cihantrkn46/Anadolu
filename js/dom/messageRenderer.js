import { escapeHtml, sanitizeHtml } from '../utils/sanitize.js';
import { renderMarkdown } from '../utils/markdown.js';

export function createCopyButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'msg-action-btn';
  btn.dataset.action = 'copy';
  btn.textContent = 'Kopyala';
  return btn;
}

export function createUserMessage(text, { pending = false, time } = {}) {
  const el = document.createElement('div');
  el.className = 'message user' + (pending ? ' pending-msg' : '');
  const label = pending ? 'Sen (Bekliyor):' : 'Sen dedin ki:';
  const t = time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  el.innerHTML =
    `<span class="msg-label">${label}</span>` +
    `<div class="msg-content">${escapeHtml(text)}</div>` +
    `<div class="msg-time">${escapeHtml(t)}</div>`;
  return el;
}

export function createAiMessageShell() {
  const el = document.createElement('div');
  el.className = 'message ai just-arrived';
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.appendChild(createCopyButton());
  el.append(
    actions,
    Object.assign(document.createElement('span'), { className: 'msg-label', textContent: 'Anadolu ai der ki:' }),
    Object.assign(document.createElement('div'), { className: 'msg-content' }),
    Object.assign(document.createElement('div'), { className: 'msg-time' }),
  );
  setTimeout(() => el.classList.remove('just-arrived'), 1200);
  return el;
}

export function setAiContent(contentEl, raw, { streaming = false } = {}) {
  if (streaming) {
    contentEl.textContent = raw;
    return;
  }
  contentEl.innerHTML = sanitizeHtml(renderMarkdown(raw));
}

export function createAiMessageFromHistory(text) {
  const el = document.createElement('div');
  el.className = 'message ai';
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.appendChild(createCopyButton());
  const label = document.createElement('span');
  label.className = 'msg-label';
  label.textContent = 'Anadolu ai der ki:';
  const content = document.createElement('div');
  content.className = 'msg-content';
  content.innerHTML = sanitizeHtml(renderMarkdown(text));
  el.append(actions, label, content);
  return el;
}

export function createDateSep(label) {
  const sep = document.createElement('div');
  sep.className = 'date-sep';
  sep.innerHTML = `<time>${escapeHtml(label)}</time>`;
  return sep;
}
