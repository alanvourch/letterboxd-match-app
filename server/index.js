import express from 'express'
import { scrapeProfile } from './scrapeLetterboxd.js'

const app = express()
const PORT = process.env.PORT || 3001

// Cache mémoire court (évite de re-scraper le même profil en boucle).
const cache = new Map() // username -> { ts, data }
const TTL = 1000 * 60 * 30 // 30 min

app.get('/api/profile/:username', async (req, res) => {
  const username = req.params.username
  const key = username.trim().toLowerCase()

  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) {
    return res.json({ ...hit.data, cached: true })
  }

  try {
    const data = await scrapeProfile(username)
    cache.set(key, { ts: Date.now(), data })
    res.json(data)
  } catch (err) {
    const status =
      err.code === 'NOT_FOUND' || err.code === 'EMPTY'
        ? 404
        : err.code === 'BAD_USERNAME'
          ? 400
          : 502
    res.status(status).json({ error: err.message, code: err.code || 'SCRAPE_ERROR' })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Letterboxd scraper API sur http://localhost:${PORT}`)
})
