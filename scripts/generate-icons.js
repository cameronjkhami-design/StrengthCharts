const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// iOS requires these icon sizes (for App Store and device)
const iosSizes = [
  { size: 20, scales: [2, 3], name: 'AppIcon-20x20' },
  { size: 29, scales: [2, 3], name: 'AppIcon-29x29' },
  { size: 40, scales: [2, 3], name: 'AppIcon-40x40' },
  { size: 60, scales: [2, 3], name: 'AppIcon-60x60' },
  { size: 76, scales: [1, 2], name: 'AppIcon-76x76' },
  { size: 83.5, scales: [2], name: 'AppIcon-83.5x83.5' },
  { size: 1024, scales: [1], name: 'AppIcon-1024x1024' },
];

// PWA sizes
const pwaSizes = [192, 512];

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#141414"/>
      <stop offset="100%" style="stop-color:#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="0" fill="url(#bg)"/>
  <g transform="translate(512, 400)">
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central"
          font-family="Arial Black, Impact, sans-serif" font-weight="900"
          font-size="360" fill="white" letter-spacing="-10">SC</text>
  </g>
  <g transform="translate(512, 640)">
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="700"
          font-size="82" fill="#FFD700" letter-spacing="12">STRENGTH</text>
  </g>
  <rect x="200" y="750" width="624" height="4" fill="#FFD700" opacity="0.6" rx="2"/>
</svg>`;

async function generate() {
  const projectRoot = path.join(__dirname, '..');
  const pwaDir = path.join(projectRoot, 'client', 'public', 'icons');
  const iosDir = path.join(projectRoot, 'ios-assets', 'AppIcon.appiconset');

  // Create directories
  fs.mkdirSync(pwaDir, { recursive: true });
  fs.mkdirSync(iosDir, { recursive: true });

  const svgBuffer = Buffer.from(svgContent);

  // Generate iOS icons
  const iosContentsImages = [];

  for (const { size, scales, name } of iosSizes) {
    for (const scale of scales) {
      const pixelSize = Math.round(size * scale);
      const filename = `${name}@${scale}x.png`;

      await sharp(svgBuffer)
        .resize(pixelSize, pixelSize)
        .png()
        .toFile(path.join(iosDir, filename));

      iosContentsImages.push({
        filename,
        idiom: size === 76 || size === 83.5 ? 'ipad' : (size === 1024 ? 'ios-marketing' : 'iphone'),
        scale: `${scale}x`,
        size: `${size}x${size}`,
      });

      console.log(`  ✓ iOS: ${filename} (${pixelSize}x${pixelSize})`);
    }
  }

  // Also generate universal icons for modern Xcode (single 1024px icon)
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(iosDir, 'AppIcon-1024.png'));
  console.log('  ✓ iOS: AppIcon-1024.png (1024x1024) [universal]');

  // Write Contents.json for Xcode asset catalog
  const contentsJson = {
    images: [
      {
        filename: 'AppIcon-1024.png',
        idiom: 'universal',
        platform: 'ios',
        size: '1024x1024',
      },
    ],
    info: {
      author: 'xcode',
      version: 1,
    },
  };

  fs.writeFileSync(
    path.join(iosDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('  ✓ iOS: Contents.json');

  // Generate PWA icons
  for (const size of pwaSizes) {
    const filename = `icon-${size}.png`;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(pwaDir, filename));
    console.log(`  ✓ PWA: ${filename}`);
  }

  // Also generate a favicon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(pwaDir, 'apple-touch-icon.png'));
  console.log('  ✓ PWA: apple-touch-icon.png (180x180)');

  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(projectRoot, 'client', 'public', 'favicon-32.png'));
  console.log('  ✓ PWA: favicon-32.png');

  console.log('\n✅ All icons generated!');
  console.log(`   iOS icons:  ${iosDir}`);
  console.log(`   PWA icons:  ${pwaDir}`);
}

generate().catch(console.error);
