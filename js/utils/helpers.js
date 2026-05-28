export function extractMessageText(msg) {
  if (!msg?.parts?.length) return '';
  const textPart = msg.parts.find((p) => typeof p.text === 'string');
  return textPart?.text || msg.parts[0]?.text || '';
}

export async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fallback */ }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch { /* ignore */ }
  ta.remove();
  return ok;
}
