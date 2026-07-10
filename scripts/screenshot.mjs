// Capture d'écran de l'app via Edge headless (puppeteer-core).
// Usage: node scripts/screenshot.mjs <url> <out.png> [width] [fullpage|viewport] [waitSelector] [extraWaitMs] [height]
import puppeteer from 'puppeteer-core'

const [url, out, width = '1280', mode = 'fullpage', waitSelector = '', extraWait = '0', height = '900'] =
  process.argv.slice(2)

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
})
const page = await browser.newPage()
await page.setViewport({ width: parseInt(width), height: parseInt(height) })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.goto(url, { waitUntil: 'networkidle2', timeout: 300000 })
if (waitSelector) await page.waitForSelector(waitSelector, { timeout: 300000 })
if (parseInt(extraWait)) await new Promise((r) => setTimeout(r, parseInt(extraWait)))
await page.screenshot({ path: out, fullPage: mode === 'fullpage' })
console.log('saved', out)
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'))
await browser.close()
