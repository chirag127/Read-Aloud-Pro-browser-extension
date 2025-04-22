const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, 'extension', 'icons', 'icon.svg');
const svgContent = fs.readFileSync(svgPath);

async function convertIcons() {
  for (const size of sizes) {
    await sharp(svgContent)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, 'extension', 'icons', `icon-${size}.png`));
    
    console.log(`Created icon-${size}.png`);
  }
}

convertIcons().catch(err => console.error('Error converting icons:', err));
