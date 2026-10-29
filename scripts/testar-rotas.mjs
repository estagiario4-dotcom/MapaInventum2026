// Confere se dá para ir de qualquer lugar para qualquer outro: node scripts/testar-rotas.mjs
import { readFileSync } from 'node:fs'
import { montarGrafo, calcularRota } from '../src/rota.js'

const dados = JSON.parse(readFileSync(new URL('../src/dados/mapa.json', import.meta.url)))
const grafo = montarGrafo(dados)
const erros = []

for (const l of dados.locais) {
  if (l.dentro) continue
  if (!dados.nos[l.no]) erros.push(`${l.nome}: o nó "${l.no}" não existe`)
  if (l.x < 0 || l.y < 0 || l.x > dados.imagem.largura || l.y > dados.imagem.altura) erros.push(`${l.nome}: fora da imagem`)
}
for (const [a, b] of dados.caminhos) {
  if (!dados.nos[a] || !dados.nos[b]) erros.push(`caminho ${a}-${b}: nó não existe`)
}
if (!erros.length) {
  let testadas = 0
  for (const a of dados.locais) for (const b of dados.locais) {
    if (a === b) continue
    testadas++
    if (!calcularRota(dados, grafo, a, b)) erros.push(`sem rota: ${a.nome} -> ${b.nome}`)
  }
  console.log(`rotas testadas: ${testadas}`)
}
console.log(erros.length ? erros.join('\n') : 'tudo certo')
process.exit(erros.length ? 1 : 0)
