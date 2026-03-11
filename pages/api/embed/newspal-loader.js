import { readFileSync } from 'fs'
import { join } from 'path'

let cachedScript = null

export default function handler(req, res) {
  if (!cachedScript) {
    cachedScript = readFileSync(join(process.cwd(), 'public/embed/newspal-loader.js'), 'utf-8')
  }

  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).send(cachedScript)
}
