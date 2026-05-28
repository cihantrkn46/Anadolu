import { initApp } from './app.js';

initApp().catch((err) => {
  console.error('Uygulama başlatılamadı:', err);
});
