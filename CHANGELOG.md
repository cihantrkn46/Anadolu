# Changelog

## 2.1.2 — Mobil ve akış düzeltmeleri

- CSS bozulması giderildi (header/aurora artıkları)
- Mobil: `responsive.css`, klavye/safe-area, dar ekran header
- Düzeltme: çevrimdışı kuyruk, yeniden dene, yalnız görsel gönderimi
- Yazıyor göstergesi kaydırma alanı dışına alındı
- Görsel ekle: `label` + erişilebilir `type="button"`

## 2.1.1 — Temizlik

- Silindi: `VERSION`, `apple-touch-icon.png`, `icon-maskable-512.png` (yinelenen)
- Silindi: `worker/README.md` (ana README’de)
- `scripts/smoke-test.mjs` eklendi

## 2.1.0 — Final

### Eklenen
- Cloudflare Worker Gemini proxy (`worker/`)
- Ayarlarda API Proxy URL alanı
- SW güncelleme bildirimi (Yenile çubuğu)
- Modal focus trap, Tefekkür modu prompt entegrasyonu
- Görsel ekleme (Gemini multimodal)
- Chat virtual list, offline kuyruk
- `netlify.toml` deploy başlıkları

### Performans
- Monolitik HTML → modüler CSS/JS
- backdrop-filter ve sürekli animasyonlar kaldırıldı
- SW precache: kritik dosyalar + küçük ikonlar
- İkonlar sıkıştırıldı (~500 KB → assets)

### Güvenlik
- API anahtarı `x-goog-api-key` header (URL’de değil)
- CSP, HTML sanitize, opsiyonel proxy

### Kaldırılan
- `icon.png` (1.1 MB), `manifest.json` duplicate
- Sparks animasyon DOM/CSS

## 1.x

- Tek dosya `index.html` prototip
