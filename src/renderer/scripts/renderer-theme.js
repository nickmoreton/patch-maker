(function attachRendererTheme(global) {
  const STORAGE_KEY = 'genos-theme-preference';
  const VALID_THEME_PREFERENCES = new Set(['system', 'light', 'dark']);
  const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

  function normalizeThemePreference(value) {
    return VALID_THEME_PREFERENCES.has(value) ? value : 'system';
  }

  function getActiveTheme(themePreference, prefersDark) {
    const normalizedPreference = normalizeThemePreference(themePreference);
    if (normalizedPreference === 'light' || normalizedPreference === 'dark') {
      return normalizedPreference;
    }

    return prefersDark ? 'dark' : 'light';
  }

  function readStoredThemePreference(storage) {
    if (!storage || typeof storage.getItem !== 'function') {
      return 'system';
    }

    try {
      return normalizeThemePreference(storage.getItem(STORAGE_KEY));
    } catch (error) {
      return 'system';
    }
  }

  function writeStoredThemePreference(storage, themePreference) {
    if (!storage || typeof storage.setItem !== 'function') {
      return;
    }

    try {
      storage.setItem(STORAGE_KEY, normalizeThemePreference(themePreference));
    } catch (error) {
      // Ignore storage failures so the UI can still function.
    }
  }

  function getSystemPrefersDark(mediaQueryList) {
    return Boolean(mediaQueryList && mediaQueryList.matches);
  }

  function resolveActiveTheme(themePreference, mediaQueryList) {
    return getActiveTheme(themePreference, getSystemPrefersDark(mediaQueryList));
  }

  function applyThemeToDocument(doc, theme) {
    if (!doc || !doc.documentElement) {
      return;
    }

    const activeTheme = theme === 'light' ? 'light' : 'dark';
    doc.documentElement.dataset.theme = activeTheme;
    doc.documentElement.style.colorScheme = activeTheme;
  }

  if (global.GenosApp && global.document) {
    const app = global.GenosApp;
    const { state } = app;
    const mediaQueryList = typeof global.matchMedia === 'function'
      ? global.matchMedia(DARK_MODE_MEDIA_QUERY)
      : null;

    function syncTheme(themePreference, options = {}) {
      const persist = options.persist !== false;
      const normalizedPreference = normalizeThemePreference(themePreference);

      state.themePreference = normalizedPreference;
      state.activeTheme = resolveActiveTheme(normalizedPreference, mediaQueryList);
      applyThemeToDocument(global.document, state.activeTheme);
      if (app.view && typeof app.view.renderThemeControl === 'function') {
        app.view.renderThemeControl();
      }

      if (persist) {
        writeStoredThemePreference(global.localStorage, normalizedPreference);
      }
    }

    function handleSystemThemeChange() {
      if (state.themePreference !== 'system') {
        return;
      }

      syncTheme('system', { persist: false });
    }

    function init() {
      const storedPreference = readStoredThemePreference(global.localStorage);
      syncTheme(storedPreference, { persist: false });

      if (!mediaQueryList) {
        return;
      }

      if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', handleSystemThemeChange);
        return;
      }

      if (typeof mediaQueryList.addListener === 'function') {
        mediaQueryList.addListener(handleSystemThemeChange);
      }
    }

    app.theme = {
      init,
      syncTheme
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      STORAGE_KEY,
      normalizeThemePreference,
      getActiveTheme,
      readStoredThemePreference,
      resolveActiveTheme,
      applyThemeToDocument
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
