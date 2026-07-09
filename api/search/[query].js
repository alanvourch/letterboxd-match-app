import { searchHandler, clientIp } from '../../server/handlers.js'

export default async function handler(req, res) {
  const out = await searchHandler(req.query.query, clientIp(req))
  res.status(out.status).json(out.body ?? {})
}
