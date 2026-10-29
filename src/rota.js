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

// Atrações de dentro do Pavilhão têm o nó da porta delas no corredor;
// as que não têm (ex.: Expositores) usam a entrada do Pavilhão
export function noDe(dados, local) {
  return local.no || dados.locais.find((l) => l.id === dados.pavilhao).no
}
// (se a atração de dentro tiver x, y, usa o ponto dela dentro do Pavilhão)
export function pontoDe(dados, local) {
  const l = local.dentro && local.x == null ? dados.locais.find((p) => p.id === dados.pavilhao) : local
  return { x: l.x, y: l.y }
}

// Rota de um lugar até outro.
// pontos: o caminho (de nó em nó); referencias: lugares com número que ficam no caminho
export function calcularRota(dados, grafo, origem, destino) {
  const r = menorCaminho(grafo, noDe(dados, origem), noDe(dados, destino))
  if (!r) return null

  const pontos = r.caminho.map((id) => dados.nos[id])
  const meio = r.caminho.slice(1, -1)
  const referencias = []
  for (const id of meio) {
    for (const l of dados.locais) {
      if (l.numero && l.no === id && l.id !== origem.id && l.id !== destino.id && !referencias.includes(l)) referencias.push(l)
    }
  }

  return { destino, pontos, referencias, metros: r.distancia * dados.metrosPorUnidade }
}
