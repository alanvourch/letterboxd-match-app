import { imgHandler, clientIp } from '../server/handlers.js'

export default async function handler(req, res) {
  const out = await imgHandler(req.query.u, clientIp(req))
  if (out.buffer) {
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v)
    res.status(out.status).end(out.buffer)
  } else {
    res.status(out.status).end()
  }
}
