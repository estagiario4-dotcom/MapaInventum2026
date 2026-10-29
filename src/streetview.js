import dados from './dados/mapa.json'

const G = dados.geo

// ponto do mapa (unidades) -> latitude/longitude
export function paraLatLon(p) {
  const metrosX = p.x / G.unidadesPorMetro
  const metrosY = p.y / G.unidadesPorMetro
  return { lat: G.lat0 - metrosY / G.myPorGrau, lon: G.lon0 + metrosX / G.mxPorGrau }
}

// link oficial do Google Maps que abre o Street View (não precisa de chave)
function link(ponto, heading) {
  const { lat, lon } = paraLatLon(ponto)
  let url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat.toFixed(6)},${lon.toFixed(6)}`
  if (heading !== undefined) url += `&heading=${Math.round(heading)}`
  return url
}

// direção da bússola de "de" para "para" (0 = norte, 90 = leste)
function direcao(de, para) {
  return ((Math.atan2(para.x - de.x, -(para.y - de.y)) * 180) / Math.PI + 360) % 360
}

// ponto mais perto numa das ruas da cidade (onde o Google tem fotos)
function pontoNaRua(alvo) {
  let melhor = null
  for (const rua of dados.chao.ruas.filter((r) => r.tipo === 'rua')) {
    for (let i = 0; i < rua.pontos.length - 1; i++) {
      const [ax, ay] = rua.pontos[i]
      const [bx, by] = rua.pontos[i + 1]
      const dx = bx - ax
      const dy = by - ay
      const t = Math.max(0, Math.min(1, ((alvo.x - ax) * dx + (alvo.y - ay) * dy) / (dx * dx + dy * dy || 1)))
      const p = { x: ax + t * dx, y: ay + t * dy }
      const d = Math.hypot(p.x - alvo.x, p.y - alvo.y)
      if (!melhor || d < melhor.d) melhor = { ...p, d }
    }
  }
  return melhor
}

// Street View de um lugar: da rua mais próxima, virado para o lugar.
// Lugares de dentro do pavilhão mostram a fachada do pavilhão.
export function streetViewDoLugar(local) {
  let alvo = { x: local.x + local.w / 2, y: local.y + local.h / 2 }
  if (local.dentro) {
    const xs = dados.chao.pavilhao.parede.map((p) => p[0])
    const ys = dados.chao.pavilhao.parede.map((p) => p[1])
    alvo = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  }
  const rua = pontoNaRua(alvo)
  return link(rua, direcao(rua, alvo))
}

// Street View de um ponto qualquer tocado no mapa
export function streetViewDoPonto(ponto) {
  return link(ponto)
}

export function abrir(url) {
  window.open(url, '_blank', 'noopener')
}
