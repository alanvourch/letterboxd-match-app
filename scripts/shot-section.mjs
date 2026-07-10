// Screenshot d'un élément précis (debug visuel).
// Usage: node scripts/shot-section.mjs <url> <out.png> <selectorText>
import puppeteer from 'puppeteer-core'

const [url, out, text] = process.argv.slice(2)
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
await page.goto(url, { waitUntil: 'networkidle2', timeout: 300000 })
await new Promise((r) => setTimeout(r, 25000))
const handle = await page.evaluateHandle((t) => {
  const sections = [...document.querySelectorAll('section, div')]
  return sections.find((s) => s.querySelector('h3')?.textContent.includes(t) && s.tagName === 'SECTION')
}, text)
if (!handle.asElement()) {
  console.log('section not found')
} else {
  await handle.asElement().screenshot({ path: out })
  console.log('saved', out)
}
await browser.close()
