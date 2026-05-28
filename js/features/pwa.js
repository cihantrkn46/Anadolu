export function initPwa({ banner, installBtn, dismissBtn }) {
  if (!banner) return { destroy() {} };

  let deferredPrompt = null;
  const isDismissed = localStorage.getItem('pwa_dismissed') === 'true';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  function showBanner() {
    banner.classList.add('show');
  }

  if (isIOS && !isStandalone && !isDismissed) {
    setTimeout(() => {
      const textSpan = banner.querySelector('.pwa-banner-text span');
      if (textSpan) {
        textSpan.innerHTML =
          "Alt menüdeki <b>Paylaş</b> ikonuna dokun ve <b>'Ana Ekrana Ekle'</b>yi seç.";
      }
      if (installBtn) installBtn.style.display = 'none';
      showBanner();
    }, 2000);
  }

  const onBip = (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isDismissed && !isIOS) showBanner();
  };

  const onInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') banner.classList.remove('show');
      deferredPrompt = null;
    });
  };

  const onDismiss = () => {
    banner.classList.remove('show');
    localStorage.setItem('pwa_dismissed', 'true');
  };

  window.addEventListener('beforeinstallprompt', onBip);
  installBtn?.addEventListener('click', onInstall);
  dismissBtn?.addEventListener('click', onDismiss);

  return {
    destroy() {
      window.removeEventListener('beforeinstallprompt', onBip);
      installBtn?.removeEventListener('click', onInstall);
      dismissBtn?.removeEventListener('click', onDismiss);
    },
  };
}

export function registerServiceWorker({ onUpdateReady } = {}) {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          onUpdateReady?.(reg);
        }

        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdateReady?.(reg);
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (sessionStorage.getItem('anadolu_sw_reload') === '1') {
            sessionStorage.removeItem('anadolu_sw_reload');
            window.location.reload();
          }
        });
      })
      .catch(() => {});
  });
}

export function activateWaitingWorker(registration) {
  sessionStorage.setItem('anadolu_sw_reload', '1');
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
