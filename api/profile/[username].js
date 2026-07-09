import { profileHandler, clientIp } from '../../server/handlers.js'

// Vercel : le scraping d'un gros profil peut durer — maxDuration est réglé au
// max du plan Hobby (300 s, Fluid compute) dans vercel.json ; le scraper
// s'auto-limite avant (SCRAPE_BUDGET_MS) pour renvoyer une erreur claire.
export default async function handler(req, res) {
  const out = await profileHandler(req.query.username, clientIp(req))
  res.status(out.status).json(out.body ?? {})
}
