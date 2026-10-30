// Monta a lista de vizinhos de cada nó a partir dos "caminhos" do JSON
export function montarGrafo(dados) {
  const vizinhos = {}
  for (const id in dados.nos) vizinhos[id] = []

  // o 3º valor do caminho (opcional) deixa o trecho "mais caro" para a rota evitar
  // (ex.: a calçada da frente do Pavilhão, para a rota passar por dentro dele)
  for (const [a, b, custo = 1] of dados.caminhos) {
    const na = dados.nos[a]
    const nb = dados.nos[b]
    const peso = Math.hypot(na.x - nb.x, na.y - nb.y) * custo
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
// O Pavilhão (e o que fica dentro sem lugar marcado) tem duas portas: usa a mais perto
function nosPossiveis(dados, local) {
  if ((local.id === dados.pavilhao || (local.dentro && !local.no)) && dados.portasPavilhao) return dados.portasPavilhao
  return [noDe(dados, local)]
}

export function calcularRota(dados, grafo, origem, destino) {
  let r = null
  for (const a of nosPossiveis(dados, origem)) {
    for (const b of nosPossiveis(dados, destino)) {
      const t = menorCaminho(grafo, a, b)
      if (t && (!r || t.distancia < r.distancia)) r = t
    }
  }
  if (!r) return null

  const pontos = r.caminho.map((id) => dados.nos[id])
  const meio = r.caminho.slice(1, -1)
  const referencias = []
  for (const id of meio) {
    for (const l of dados.locais) {
      if (l.numero && l.no === id && l.id !== origem.id && l.id !== destino.id && !referencias.includes(l)) referencias.push(l)
    }
  }

  // distância de verdade (sem o custo extra dos trechos evitados)
  let d = 0
  for (let i = 1; i < pontos.length; i++) d += Math.hypot(pontos[i].x - pontos[i - 1].x, pontos[i].y - pontos[i - 1].y)
  const ehPav = (l) => l.dentro || l.id === dados.pavilhao
  const pelaPavilhao = !ehPav(origem) && !ehPav(destino) && r.caminho.some((id) => id.startsWith('pv'))

  // trechos na ORDEM em que a pessoa passa: lugares com número e a travessia do Pavilhão
  // (quando a rota usa os corredores de dentro, o próprio Pavilhão não entra como "lugar")
  const usaDentro = r.caminho.some((id) => id.startsWith('pv'))
  const trechos = []
  for (const id of meio) {
    if (pelaPavilhao && id.startsWith('pv')) {
      if (!trechos.some((t) => t.pavilhao)) trechos.push({ pavilhao: true })
      continue
    }
    for (const l of dados.locais) {
      if (!l.numero || l.no !== id || l.id === origem.id || l.id === destino.id) continue
      if (usaDentro && l.id === dados.pavilhao) continue
      if (!trechos.some((t) => t.local === l)) trechos.push({ local: l })
    }
  }
  return { destino, pontos, referencias, trechos, pelaPavilhao, metros: d * dados.metrosPorUnidade }
}
