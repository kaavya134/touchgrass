// Usage: node test-screenshot-live.js path/to/real-screenshot.png
require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true })
const fs = require('fs')
const path = require('path')
const { analyzeScreenshot } = require('./screenshot')
async function main() {
  const file = process.argv[2]
  if (!file) throw new Error('Supply the path to a real screen-time screenshot.')
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(file).toLowerCase()]
  if (!mime) throw new Error('Use PNG, JPEG, or WebP.')
  try {
    const result = await analyzeScreenshot(`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`)
    console.log('Live screenshot analysis succeeded:', JSON.stringify(result))
  } catch (error) {
    console.error(error.status ? error.message : 'Live screenshot test failed before receiving an analysis.')
    process.exitCode = 1
  }
}
main().catch(() => { console.error('Supply a readable screenshot path.'); process.exitCode = 1 })
