const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STORAGE_KEY,
  normalizeThemePreference,
  getActiveTheme,
  readStoredThemePreference,
  resolveActiveTheme,
  applyThemeToDocument
} = require('../src/renderer/scripts/renderer-theme');

test('normalizeThemePreference falls back to system for invalid values', () => {
  assert.equal(normalizeThemePreference('light'), 'light');
  assert.equal(normalizeThemePreference('dark'), 'dark');
  assert.equal(normalizeThemePreference('system'), 'system');
  assert.equal(normalizeThemePreference('sepia'), 'system');
  assert.equal(normalizeThemePreference(undefined), 'system');
});

test('getActiveTheme resolves system preference from OS mode', () => {
  assert.equal(getActiveTheme('light', true), 'light');
  assert.equal(getActiveTheme('dark', false), 'dark');
  assert.equal(getActiveTheme('system', true), 'dark');
  assert.equal(getActiveTheme('system', false), 'light');
});

test('readStoredThemePreference restores saved values and rejects invalid ones', () => {
  const storage = {
    getItem(key) {
      assert.equal(key, STORAGE_KEY);
      return 'dark';
    }
  };

  assert.equal(readStoredThemePreference(storage), 'dark');
  assert.equal(readStoredThemePreference({ getItem: () => 'unexpected' }), 'system');
  assert.equal(readStoredThemePreference({ getItem: () => { throw new Error('blocked'); } }), 'system');
  assert.equal(readStoredThemePreference(null), 'system');
});

test('resolveActiveTheme uses media query matches for system preference', () => {
  assert.equal(resolveActiveTheme('system', { matches: true }), 'dark');
  assert.equal(resolveActiveTheme('system', { matches: false }), 'light');
  assert.equal(resolveActiveTheme('dark', { matches: false }), 'dark');
});

test('applyThemeToDocument writes the active theme to the root element', () => {
  const root = {
    dataset: {},
    style: {}
  };
  const doc = {
    documentElement: root
  };

  applyThemeToDocument(doc, 'light');
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.style.colorScheme, 'light');

  applyThemeToDocument(doc, 'dark');
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.style.colorScheme, 'dark');
});
