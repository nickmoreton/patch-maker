(function preloadTheme(global) {
  const STORAGE_KEY = 'genos-theme-preference';
  const VALID_PREFERENCES = new Set(['system', 'light', 'dark']);

  function normalizeThemePreference(value) {
    return VALID_PREFERENCES.has(value) ? value : 'system';
  }

  function resolveTheme(preference) {
    if (preference === 'light' || preference === 'dark') {
      return preference;
    }

    if (typeof global.matchMedia === 'function') {
      return global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'dark';
  }

  let preference = 'system';
  try {
    preference = normalizeThemePreference(global.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    preference = 'system';
  }

  const theme = resolveTheme(preference);
  const root = global.document && global.document.documentElement;

  if (root) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }
})(window);
