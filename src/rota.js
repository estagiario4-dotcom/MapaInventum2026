// Monta a lista de vizinhos de cada nó a partir dos "caminhos" do JSON
export function montarGrafo(dados) {
  const vizinhos = {}
  for (const id in dados.nos) vizinhos[id] = []

  for (const [a, b] of dados.caminhos) {
    const na = dados.nos[a]
    const nb = dados.nos[b]
    const peso = Math.hypot(na.x - nb.x, na.y - nb.y)
    vizinhos[a].push({ id: b, peso })
    vizinhos[b].push({ id: a, peso })
  }
  return vizinhos
}

// Dijkstra: menor caminho entre dois nós
function menorCaminho(grafo, inicio, fim) {
  const dist = { [inicio]: 0 }
  const anterior = {}
  const abertos = new Set([inicio])
  const visitados = new Set()

  while (abertos.size) {
    // pega o nó aberto com menor distância
    let atual = null
    for (const id of abertos) {
      if (atual === null || dist[id] < dist[atual]) atual = id
    }
    abertos.delete(atual)
    visitados.add(atual)
    if (atual === fim) break

    for (const { id, peso } of grafo[atual]) {
      if (visitados.has(id)) continue
      const nova = dist[atual] + peso
      if (dist[id] === undefined || nova < dist[id]) {
        dist[id] = nova
        anterior[id] = atual
        abertos.add(id)
      }
    }
  }

  if (dist[fim] === undefined) return null

  const caminho = [fim]
  while (caminho[0] !== inicio) caminho.unshift(anterior[caminho[0]])
  return { caminho, distancia: dist[fim] }
}

// Ponto na borda do bloco mais perto do corredor (a "porta" do local)
// x, y do local = canto superior esquerdo
export function porta(local, no) {
  return {
    x: Math.min(Math.max(no.x, local.x), local.x + local.w),
    y: Math.min(Math.max(no.y, local.y), local.y + local.h),
  }
}

// Rota até o destino mais perto (ex.: quando há mais de um "Banheiros")
export function calcularRota(dados, grafo, origem, destinos) {
  let melhor = null
  for (const destino of destinos) {
    const r = menorCaminho(grafo, origem.no, destino.no)
    if (r && (!melhor || r.distancia < melhor.distancia)) melhor = { ...r, destino }
  }
  if (!melhor) return null

  const pontos = [
    porta(origem, dados.nos[origem.no]),
    ...melhor.caminho.map((id) => dados.nos[id]),
    porta(melhor.destino, dados.nos[melhor.destino.no]),
  ]
  return { destino: melhor.destino, pontos }
}
