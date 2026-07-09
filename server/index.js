import express from 'express'
import {
  profileHandler,
  searchHandler,
  enrichHandler,
  imgHandler,
  clientIp,
} from './handlers.js'

// Serveur de DEV local uniquement. En production (Vercel), les mêmes handlers
// sont exposés par les fonctions serverless du dossier api/.

// Charge .env (clé TMDB…) sans dépendance : Node 20.12+.
try {
  process.loadEnvFile('.env')
} catch {
  /* pas de .env : l'app tourne, sans enrichissement TMDB */
}

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json({ limit: '256kb' }))

const send = (res, out) => res.status(out.status).json(out.body ?? {})

app.get('/api/profile/:username', async (req, res) =>
  send(res, await profileHandler(req.params.username, clientIp(req))),
)

app.get('/api/search/:query', async (req, res) =>
  send(res, await searchHandler(req.params.query, clientIp(req))),
)

app.post('/api/enrich', async (req, res) =>
  send(res, await enrichHandler(req.body, clientIp(req))),
)

app.get('/api/img', async (req, res) => {
  const out = await imgHandler(req.query.u, clientIp(req))
  if (out.buffer) {
    res.set(out.headers)
    res.status(out.status).end(out.buffer)
  } else {
    res.status(out.status).end()
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Letterboxd scraper API sur http://localhost:${PORT}`)
})
