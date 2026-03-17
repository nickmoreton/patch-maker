# Genos Patch Browser

A desktop MIDI utility app for browsing and sending patches to the Yamaha Genos workstation.

![Genos Patch Browser](screen.png)

## Features

- 🎹 Browse all 1,711 Genos voice patches organized by category
- 🔍 Search and filter patches instantly
- 🎵 Send patches directly to your Genos via MIDI
- 📁 Load custom patch lists from JSON files
- 🎛️ Select MIDI channel (1-16)

## App Icon (macOS)

- The app includes a piano keyboard icon for the macOS Dock.
- Source SVG: [assets/app-icon.svg](assets/app-icon.svg)
- Generated iconset: [assets/AppIcon.iconset](assets/AppIcon.iconset)
- Packaged mac icon: [assets/AppIcon.icns](assets/AppIcon.icns)

Build the icons:

```bash
npm run icons:build
```

During development (`npm start`) on macOS, the Dock icon uses [assets/dock-icon-512.png](assets/dock-icon-512.png). If missing, Electron falls back to its default icon.

## Installation

### Prerequisites

- Node.js 18 or later
- npm or yarn

### Setup

1. Clone or download this folder

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the app:
   ```bash
   npm start
   ```

### Building for Distribution

To create a standalone app:

```bash
# For macOS
npm run build:mac

# For Windows
npm run build:win
```

The built app will be in the `dist` folder.

## Usage

1. **Connect your Genos** via USB-MIDI to your computer

2. **Select MIDI Output** from the dropdown (look for "Digital Workstation Port 1")

3. **Choose MIDI Channel** (default is 1)

4. **Browse patches** by clicking categories on the left

5. **Send a patch** by:
   - Double-clicking any patch card
   - Or selecting a patch and clicking "Send to Genos"

## Troubleshooting

### MIDI device not showing up

- Make sure your Genos is connected via USB and powered on
- Try clicking the refresh button (🔄) next to the MIDI dropdown
- On macOS, you may need to allow MIDI access in System Preferences

### Patches not changing on Genos

- Ensure you've selected the correct MIDI channel
- The Genos should be set to receive program changes on that channel
- Try Port 1 first, then Port 2 if needed

## Technical Details

- Built with Electron
- Uses the `midi` npm package for native MIDI access
- Falls back to Web MIDI API if native MIDI is unavailable

## Archived Export Code

Logic preset export is currently parked outside the live app flow. The preserved implementation lives in [`archived/export/README.md`](archived/export/README.md) and is not packaged with the app.

## License

MIT
