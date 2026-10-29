// Confere se todos os lugares estão dentro da cerca e se todas as rotas ficam dentro do parque.
// Uso: node scripts/testar-rotas.mjs
import fs from 'node:fs'
import { montarGrafo, calcularRota } from '../src/rota.js'
const dados = JSON.parse(fs.readFileSync(new URL('../src/dados/mapa.json', import.meta.url), 'utf8'))
const K = dados.geo.unidadesPorMetro
const cerca = dados.chao.parque.map(([x, y]) => [x, y])
function dentro([x, y]) {
  let d = false
  for (let i = 0, j = cerca.length - 1; i < cerca.length; j = i++) {
    const [x1, y1] = cerca[i], [x2, y2] = cerca[j]
    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) d = !d
  }
  return d
}
// distância de um ponto até a cerca (para tolerar pontos em cima dela, ex.: pórticos)
function distCerca([x, y]) {
  let m = Infinity
  for (let i = 0, j = cerca.length - 1; i < cerca.length; j = i++) {
    const [ax, ay] = cerca[j], [bx, by] = cerca[i]
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    m = Math.min(m, Math.hypot(ax + t * dx - x, ay + t * dy - y))
  }
  return m / K
}
// 1) lugares fora da cerca
for (const l of dados.locais) {
  const pts = l.pontos || [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.h], [l.x, l.y + l.h]]
  const fora = pts.filter((p) => !dentro(p) && distCerca(p) > 1.5)
  if (fora.length) console.log('FORA DA CERCA:', l.id, fora.length, 'cantos, até', Math.max(...fora.map(distCerca)).toFixed(1), 'm')
}
// 2) caminhos fora da cerca
const ruim = dados.caminhos.filter(([a, b]) => ![a, b].every((n) => dentro([dados.nos[n].x, dados.nos[n].y]) || distCerca([dados.nos[n].x, dados.nos[n].y]) < 1.5))
console.log('caminhos fora da cerca:', ruim.length)
// 3) todas as rotas
const grafo = montarGrafo(dados)
const grupos = {}
for (const l of dados.locais) (grupos[l.nome] ??= []).push(l)
let total = 0, falhas = 0, saem = 0
for (const o of dados.locais) for (const nome of Object.keys(grupos)) {
  if (nome === o.nome) continue
  total++
  const r = calcularRota(dados, grafo, o, grupos[nome])
  if (!r) { falhas++; console.log('SEM ROTA', o.id, '->', nome); continue }
  const meio = r.pontos.slice(1, -1)
  if (meio.some((p) => !dentro([p.x, p.y]) && distCerca([p.x, p.y]) > 1.5)) { saem++; if (saem < 6) console.log('SAI DO PARQUE', o.id, '->', nome) }
}
console.log(`rotas testadas: ${total}, sem rota: ${falhas}, que saem do parque: ${saem}`)
const k = calcularRota(dados, grafo, dados.locais.find((l) => l.id === 'food-trucks'), grupos['Kartódromo (Corrida Maluca)'])
console.log('food-trucks -> kartódromo passa por', k.pontos.length, 'pontos; metros ≈', Math.round(k.pontos.reduce((s, p, i, a) => i ? s + Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y) : 0, 0) / K))
