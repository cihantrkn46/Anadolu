import { escapeHtml } from './sanitize.js';

function inlineMarkdown(s) {
  let html = escapeHtml(s);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  return html;
}

export function renderMarkdown(raw) {
  const lines = String(raw).split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;
  let inPre = false;
  const preLines = [];

  function closeLists() {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf('```') === 0) {
      closeLists();
      if (inPre) {
        out.push('<pre>' + escapeHtml(preLines.join('\n')) + '</pre>');
        preLines.length = 0;
        inPre = false;
      } else {
        inPre = true;
      }
      continue;
    }
    if (inPre) { preLines.push(line); continue; }
    if (line.trim() === '') { closeLists(); continue; }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) { closeLists(); out.push('<h3>' + escapeHtml(h3Match[1]) + '</h3>'); continue; }

    const ulMatch = line.match(/^[-\u2022]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push('<li>' + inlineMarkdown(ulMatch[1]) + '</li>');
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push('<li>' + inlineMarkdown(olMatch[1]) + '</li>');
      continue;
    }

    closeLists();
    out.push('<p>' + inlineMarkdown(line) + '</p>');
  }

  closeLists();
  if (inPre) out.push('<pre>' + escapeHtml(preLines.join('\n')) + '</pre>');
  return out.join('');
}
