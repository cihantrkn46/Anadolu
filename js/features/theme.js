export function createThemeController({ themeBtn, metaThemeColor, onChange }) {
  let currentTheme = localStorage.getItem('anadoluTheme') || 'dark';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#f4ecdf' : '#0c0907');
    }
  }

  apply(currentTheme);

  themeBtn?.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('anadoluTheme', currentTheme);
    apply(currentTheme);
    onChange?.(currentTheme);
  });

  return { getTheme: () => currentTheme, apply };
}
