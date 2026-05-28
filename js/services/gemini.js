import { sanitizeInput } from '../utils/sanitize.js';
import { getProxyBaseUrl, usesProxy } from '../config.js';

const MAX_HISTORY = 16;
const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';

export function buildSystemPrompt(userName, { tefekkurMode = false } = {}) {
  const safeName = sanitizeInput(userName) || 'Kardaşım';
  const tefekkur =
    tefekkurMode
      ? '\nTefekkür modundasın: daha derin, felsefi ve dingin bir üslup kullan; acele etme.'
      : '';
  return `Sen ANADOLU ai'sin — "Has Yapay Zeka". Anadolu'nun kadim bilgeliğini ve modern teknolojinin gücünü birleştiren bir dijital bilgesin.
Görsel sistemin bakır, altın ve toprak tonlarıyla tasarlandı; asil ve şiirsel konuş.
Kullanıcının hitap şekli: "${safeName}". Ona samimi ve saygılı yaklaş.
Kahramanmaraş ve Anadolu kültürüne hakimsin.
Teknik sorulara doğru cevap ver; bilmediğinde dürüst ol.${tefekkur}`;
}

export function trimHistory(conversationHistory) {
  let sendHistory = conversationHistory.slice(-MAX_HISTORY);
  if (sendHistory.length > 0 && sendHistory[0].role !== 'user') sendHistory.shift();
  return sendHistory;
}

function buildPayload(conversationHistory, userName, tefekkurMode) {
  return {
    system_instruction: { parts: [{ text: buildSystemPrompt(userName, { tefekkurMode }) }] },
    contents: trimHistory(conversationHistory),
    generationConfig: {
      temperature: tefekkurMode ? 0.95 : 0.85,
      maxOutputTokens: tefekkurMode ? 1400 : 1200,
      topP: 0.95,
    },
  };
}

function resolveUrl(model) {
  if (usesProxy()) {
    return `${getProxyBaseUrl()}?model=${encodeURIComponent(model)}`;
  }
  return `${GEMINI_ORIGIN}/v1beta/models/${model}:streamGenerateContent?alt=sse`;
}

function buildHeaders(apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (!usesProxy()) headers['x-goog-api-key'] = apiKey;
  return headers;
}

export async function streamGemini({
  apiKey,
  model,
  conversationHistory,
  userName,
  tefekkurMode = false,
  signal,
  onChunk,
}) {
  const payload = buildPayload(conversationHistory, userName, tefekkurMode);
  const url = resolveUrl(model);

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error?.message) errMsg = errData.error.message;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const raw = line.trim();
      if (!raw.startsWith('data:')) continue;
      const json = raw.slice(5).trim();
      if (!json || json === '[DONE]') continue;
      try {
        const chunk = JSON.parse(json);
        const part = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (part) {
          fullText += part;
          onChunk(fullText);
        }
      } catch { /* skip malformed */ }
    }
  }

  return fullText;
}
