# Anadolu ai — PWA v2.1.0

Production-ready vanilla JS sohbet PWA (Google Gemini).

## Hızlı başlangıç

```bash
npm start
# veya: python3 -m http.server 8080
```

Tarayıcı: **http://localhost:8080**

1. ⚙ **Ayarlar** → Gemini API anahtarı **veya** Proxy URL
2. Sohbete başla

> Localhost’ta SW sınırlı çalışabilir. Tam PWA testi için HTTPS (Netlify, Cloudflare Pages, vb.).

## Production deploy

### Statik site (Netlify / Pages / GitHub Pages)

Kök dizini yayınla. `netlify.toml` güvenlik başlıklarını içerir.

### API proxy (önerilen)

```bash
npm run deploy:worker
# wrangler secret put GEMINI_API_KEY  (ilk sefer)
```

Worker URL → uygulama **Ayarlar → API Proxy**. API anahtarı alanı isteğe bağlı kalır.

## Mimari

| Dizin | İçerik |
|--------|--------|
| `index.html` | Uygulama kabuğu |
| `styles/` | tokens, base, motion |
| `js/` | ES modüller (app, gemini, storage, …) |
| `assets/icons/` | PWA ikonları |
| `worker/` | Cloudflare Gemini proxy |
| `sw.js` | Offline + precache v2.1.0 |

## Özellikler

- Streaming Gemini yanıtları
- IndexedDB sohbet geçmişi
- Offline mesaj kuyruğu
- Tema (açık/koyu), TTS, mikrofon
- Tefekkür modu, görsel ekleme
- PWA install + SW güncelleme bildirimi

## Güvenlik

- CSP, sanitize edilmiş AI HTML
- Proxy ile anahtar sunucuda tutulabilir
- Doğrudan modda anahtar yalnızca `localStorage` (XSS riskine karşı proxy tercih et)

## Sürüm

Sürüm: `package.json` → `version`. Bkz. [CHANGELOG.md](./CHANGELOG.md).
