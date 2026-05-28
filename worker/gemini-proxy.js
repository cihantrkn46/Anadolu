/**
 * Cloudflare Worker — Gemini SSE proxy
 * Deploy: wrangler deploy (GEMINI_API_KEY secret gerekli)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function cors(origin) {
  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': origin || '*',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors(origin) });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: { message: 'GEMINI_API_KEY tanımlı değil' } },
        { status: 500, headers: cors(origin) },
      );
    }

    const url = new URL(request.url);
    const model = url.searchParams.get('model') || 'gemini-2.5-flash';
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

    let body;
    try {
      body = await request.text();
    } catch {
      return Response.json(
        { error: { message: 'Geçersiz istek gövdesi' } },
        { status: 400, headers: cors(origin) },
      );
    }

    const upstream = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body,
    });

    const headers = new Headers(cors(origin));
    const ct = upstream.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);
    headers.set('Cache-Control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
