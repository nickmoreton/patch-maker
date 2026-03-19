# Repository Guidelines

## Project Structure & Module Organization

This repository is a small Electron app organized under `src/`. `src/electron/main.js` owns the Electron lifecycle, window creation, MIDI IPC, and favourite-list persistence. `src/electron/preload.js` exposes the safe renderer bridge. The renderer UI lives in `src/renderer/`, with browser-side logic in `src/renderer/scripts/`, HTML in `src/renderer/index.html`, and styles in `src/renderer/styles/`. The default patch dataset lives at `src/data/patches.json`. Archived Logic preset export code is preserved under `archived/export/`. Icons and packaging assets live in `assets/`, while one-off build helpers live in `scripts/`.

## Build, Test, and Development Commands

Install dependencies with `npm install`. Run the app locally with `npm start`. Run automated checks with `npm test`, which uses Node's built-in test runner against files in `tests/`. Package distributables with `npm run build`, or target a platform with `npm run build:mac` or `npm run build:win`; Electron Builder writes output to `dist/`. Rebuild icon assets with `npm run icons:build`, which regenerates `assets/AppIcon.iconset`, `assets/AppIcon.icns`, and the Dock PNG from `assets/app-icon.svg`.

## Coding Style & Naming Conventions

Match the existing JavaScript style: 2-space indentation, semicolons, and single quotes except where double quotes are already required. Keep modules in CommonJS format (`require`, `module.exports`) to stay consistent with the Electron entry points. Use `camelCase` for functions and variables, `UPPER_SNAKE_CASE` only for true constants, and descriptive DOM ids that mirror renderer state names. Prefer small, direct functions over framework-style abstractions; this codebase is intentionally simple and file-oriented.

## Testing Guidelines

Run `npm test` before shipping changes, and validate UI work manually with `npm start`. For renderer changes, verify patch loading, category and patch filtering, selected-patch add/remove flows, favourite save/load/delete behavior, MIDI connection state, and individual or bulk send behavior when hardware is available. There is still no lint configuration checked in. If you add more automated coverage, keep tests in `tests/` or beside the module they cover and document any new commands in `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Freeze bulk send edits and escape MIDI device menu markup` and `Add GitHub Actions CI for tests and macOS builds`. Keep commit messages concise, capitalized, and focused on one change. PRs should explain the user-visible impact, link any related issue, list validation commands, and include screenshots when `src/renderer/index.html`, `src/renderer/scripts/renderer.js`, or `src/renderer/styles/index.css` changes affect the UI.
