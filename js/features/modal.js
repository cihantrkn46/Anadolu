const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function createModalController(overlay) {
  if (!overlay) return { destroy() {} };

  let previousFocus = null;

  function getFocusable(container) {
    return [...container.querySelectorAll(FOCUSABLE)].filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
  }

  function onKeyDown(e) {
    if (e.key !== 'Tab' || !overlay.classList.contains('active')) return;
    const modal = overlay.querySelector('.modal');
    if (!modal) return;
    const nodes = getFocusable(modal);
    if (!nodes.length) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const observer = new MutationObserver(() => {
    if (overlay.classList.contains('active')) {
      previousFocus = document.activeElement;
      const modal = overlay.querySelector('.modal');
      const nodes = modal ? getFocusable(modal) : [];
      (nodes[0] || modal)?.focus?.();
    } else if (previousFocus?.focus) {
      previousFocus.focus();
      previousFocus = null;
    }
  });

  observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  overlay.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      observer.disconnect();
      overlay.removeEventListener('keydown', onKeyDown);
    },
  };
}
