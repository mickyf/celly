import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const sizes = [192, 512]
const svgPath = join(__dirname, '../public/app-icon.svg')
const svgBuffer = readFileSync(svgPath)

console.log('Generating PWA icons...')

for (const size of sizes) {
  const outputPath = join(__dirname, `../public/pwa-${size}x${size}.png`)

  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath)

  console.log(`✓ Generated ${size}x${size} icon`)
}

// Generate favicon
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(join(__dirname, '../public/favicon.png'))

console.log('✓ Generated favicon.png')

// Generate apple-touch-icon
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(join(__dirname, '../public/apple-touch-icon.png'))

console.log('✓ Generated apple-touch-icon.png')

console.log('\nAll icons generated successfully!')
