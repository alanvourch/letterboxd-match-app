// Teste le rendu de la carte partageable dans un vrai navigateur (Edge
// headless) : pipeline complet profils -> compatibilité -> enrichissement ->
// canvas, puis export PNG. Usage:
//   node scripts/test-sharecard.mjs <userA> <userB> <out.png>
// Nécessite `npm run dev` (ports 5173 + 3001).
import puppeteer from 'puppeteer-core'
import { writeFile } from 'node:fs/promises'

const [userA = 'nashkel', userB = 'kurstboy', out = 'sharecard.png'] = process.argv.slice(2)

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })

const dataUrl = await page.evaluate(
  async (a, b) => {
    const { filmKey } = await import('/src/lib/filmKey.js')
    const { computeCompatibility } = await import('/src/lib/compatibility.js')
    const { enrichResult } = await import('/src/lib/enrich.js')
    const { renderShareCard } = await import('/src/lib/shareCard.js')

    const load = async (u) => {
      const r = await fetch('/api/profile/' + u)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const films = new Map()
      for (const f of d.films) films.set(filmKey(f.name, f.year), f)
      return { ...d, films }
    }
    const result = computeCompatibility(await load(a), await load(b))
    const enrichMap = await enrichResult(result)
    const canvas = await renderShareCard(result, enrichMap)
    return canvas.toDataURL('image/png')
  },
  userA,
  userB,
)

await writeFile(out, Buffer.from(dataUrl.split(',')[1], 'base64'))
console.log('saved', out)
await browser.close()
