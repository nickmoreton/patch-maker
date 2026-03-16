# Repository Guidelines

## Project Structure & Module Organization

This repository is a small Electron app with root-level entry points instead of a `src/` directory. `main.js` owns the Electron lifecycle, window creation, MIDI IPC, and file dialogs. `preload.js` exposes the safe renderer bridge, and `renderer.js` contains the browser-side UI logic. `index.html` and `styles.css` define the interface, `pst-generator.js` builds Logic `.pst` files, and `patches.json` is the default patch dataset. Icons and packaging assets live in `assets/`, while one-off build helpers live in `scripts/`.

## Build, Test, and Development Commands

Install dependencies with `npm install`. Run the app locally with `npm start`. Package distributables with `npm run build`, or target a platform with `npm run build:mac` or `npm run build:win`; Electron Builder writes output to `dist/`. Rebuild icon assets with `npm run icons:build`, which regenerates `assets/AppIcon.iconset`, `assets/AppIcon.icns`, and the Dock PNG from `assets/app-icon.svg`.

## Coding Style & Naming Conventions

Match the existing JavaScript style: 2-space indentation, semicolons, and single quotes except where double quotes are already required. Keep modules in CommonJS format (`require`, `module.exports`) to stay consistent with the Electron entry points. Use `camelCase` for functions and variables, `UPPER_SNAKE_CASE` only for true constants, and descriptive DOM ids that mirror renderer state names. Prefer small, direct functions over framework-style abstractions; this codebase is intentionally simple and file-oriented.

## Testing Guidelines

There is no automated test suite or lint configuration checked in today. Validate changes manually with `npm start`, and include the exact flows you exercised in your PR description. For UI changes, verify patch loading, category/search filtering, MIDI connection behavior when available, and Logic preset export. If you add automated coverage, document the command in `package.json` and keep test files in a dedicated `tests/` folder or beside the module they cover.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Add exported Genos patches zip file` and `Update screenshot image and remove obsolete patch file`. Keep commit messages concise, capitalized, and focused on one change. PRs should explain the user-visible impact, link any related issue, list validation commands, and include screenshots when `index.html`, `renderer.js`, or `styles.css` changes affect the UI.
