// Gera um QR code (PNG) para cada local do mapa.
// Uso: npm run qrcodes -- https://endereco-do-cloud-run
import fs from 'node:fs'
import QRCode from 'qrcode'

const dados = JSON.parse(fs.readFileSync(new URL('../src/dados/mapa.json', import.meta.url), 'utf8'))
const base = process.argv[2]?.replace(/\/$/, '')

if (!base) {
  console.log('Uso: npm run qrcodes -- https://endereco-do-cloud-run')
  process.exit(1)
}

fs.mkdirSync('qrcodes', { recursive: true })

for (const local of dados.locais) {
  const url = `${base}/?aqui=${local.id}`
  await QRCode.toFile(`qrcodes/${local.id}.png`, url, { width: 800, margin: 2 })
  console.log(`${local.nome} -> ${url}`)
}
