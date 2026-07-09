import { enrichHandler, clientIp } from '../server/handlers.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST attendu' })
  const out = await enrichHandler(req.body, clientIp(req))
  res.status(out.status).json(out.body ?? {})
}
