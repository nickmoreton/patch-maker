# Archived Export Feature

Logic preset export is intentionally paused in the live app.

The preserved implementation lives in [`pst-generator.js`](pst-generator.js) so it can be reintroduced later without redoing the reverse-engineered `.pst` work.

To restore the feature:

1. Re-add the export bridge methods in [`src/electron/preload.js`](../../src/electron/preload.js).
2. Re-add the `export-pst` and `export-batch-pst` IPC handlers in [`src/electron/main.js`](../../src/electron/main.js) and require this archived generator there.
3. Reintroduce the export controls and any desired selection UI in the renderer files.

This folder is repo-only and is not included in the packaged app.
