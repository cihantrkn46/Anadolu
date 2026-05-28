/** Klavye ve safe-area — tüm mobil tarayıcılar */
export function initViewport({ bottomSection, chatArea, userInput }) {
  if (!bottomSection) return () => {};

  const setKeyboard = (open) => {
    document.body.classList.toggle('keyboard-open', open);
  };

  const onResize = () => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const keyboardLikely = vv.height < window.innerHeight * 0.75;
    setKeyboard(keyboardLikely);

    if (keyboardLikely && document.activeElement === userInput) {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      bottomSection.style.paddingBottom = `${Math.max(8, offset)}px`;
      requestAnimationFrame(() => {
        chatArea?.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
      });
    } else {
      bottomSection.style.paddingBottom = '';
    }
  };

  const onFocus = () => {
    setTimeout(onResize, 50);
    setTimeout(onResize, 300);
  };

  const onBlur = () => {
    setKeyboard(false);
    bottomSection.style.paddingBottom = '';
  };

  window.visualViewport?.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('scroll', onResize);
  userInput?.addEventListener('focus', onFocus);
  userInput?.addEventListener('blur', onBlur);

  return () => {
    window.visualViewport?.removeEventListener('resize', onResize);
    window.visualViewport?.removeEventListener('scroll', onResize);
    userInput?.removeEventListener('focus', onFocus);
    userInput?.removeEventListener('blur', onBlur);
    setKeyboard(false);
    bottomSection.style.paddingBottom = '';
  };
}
