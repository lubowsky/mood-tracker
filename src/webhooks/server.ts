// src/webhook/server.ts
import http from 'http'
import { handleYooKassaWebhook } from './yookassa'

export function startWebhookServer() {
  http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/yookassa/webhook') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          await handleYooKassaWebhook(JSON.parse(body))
          res.writeHead(200)
          res.end('ok')
        } catch (e) {
          console.error(e)
          res.writeHead(500)
          res.end('error')
        }
      })
      return
    }

    res.writeHead(404)
    res.end()
  }).listen(3001, () => {
    console.log('💳 YooKassa webhook listening on :3001')
  })
}
