const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const srcSvg = path.join(__dirname, '..', 'assets', 'app-icon.svg');
  const iconsetDir = path.join(__dirname, '..', 'assets', 'AppIcon.iconset');

  if (!fs.existsSync(srcSvg)) {
    console.error('Source SVG not found at', srcSvg);
    process.exit(1);
  }

  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  const sizes = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_512x512@2x.png', size: 1024 },
  ];

  try {
    for (const { name, size } of sizes) {
      const outPath = path.join(iconsetDir, name);
      await sharp(srcSvg)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outPath);
      console.log('Generated', name);
    }

    // Also export a dev PNG we can use for app.dock.setIcon
    const devPng = path.join(__dirname, '..', 'assets', 'dock-icon-512.png');
    await sharp(srcSvg)
      .resize(512, 512)
      .png()
      .toFile(devPng);
    console.log('Generated dock icon at', devPng);
  } catch (err) {
    console.error('Failed generating icons:', err);
    process.exit(1);
  }
})();
