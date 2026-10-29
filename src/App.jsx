import { useEffect, useRef, useState } from 'react'
import dados from './dados/mapa.json'
import { montarGrafo, calcularRota } from './rota'
import Mapa, { MAPA_INTEIRO, iconeDe } from './Mapa'
import { abrir, streetViewDoLugar, streetViewDoPonto } from './streetview'
import './App.css'

const grafo = montarGrafo(dados)
const params = new URLSearchParams(window.location.search)
const editor = params.has('editor')

// locais com o mesmo nome viram um destino só (ex.: "Banheiros" -> vai pro mais perto)
const grupos = {}
for (const local of dados.locais) (grupos[local.nome] ??= []).push(local)
const nomes = Object.keys(grupos).sort((a, b) => a.localeCompare(b))

const buscarLocal = (id) => dados.locais.find((l) => l.id === id)
const semAcento = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// atalhos do painel
const ATALHOS = [
  { nome: 'Banheiros', teste: (l) => l.nome === 'Banheiros' },
  { nome: 'Comida', teste: (l) => l.categoria === 'alimentacao' },
  { nome: 'Palcos', teste: (l) => l.categoria === 'palco' },
  { nome: 'Estandes', teste: (l) => l.categoria === 'estande' },
  { nome: 'Atrações', teste: (l) => l.categoria === 'atracao' },
  { nome: 'Entradas', teste: (l) => l.categoria === 'acesso' },
]

// em que parte do evento o lugar fica
function regiao(l) {
  if (l.dentro) return 'Dentro do Pavilhão'
  if (l.y > 1100) return 'Kartódromo'
  return 'Área externa'
}

// distância da rota (1 metro = 4 unidades do mapa, medidas do OpenStreetMap)
function tempoAPe(pontos) {
  let d = 0
  for (let i = 1; i < pontos.length; i++) d += Math.hypot(pontos[i].x - pontos[i - 1].x, pontos[i].y - pontos[i - 1].y)
  const metros = d / 4
  const min = Math.max(1, Math.round(metros / 75))
  return `${min} min a pé`
}

function caixaEmVolta(locais, pontos = []) {
  const xs = pontos.map((p) => p.x)
  const ys = pontos.map((p) => p.y)
  for (const b of locais) { xs.push(b.x, b.x + b.w); ys.push(b.y, b.y + b.h) }
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(Math.max(...xs) - x, 220), h: Math.max(Math.max(...ys) - y, 160) }
}

// primeira visão: no celular, perto de você; no computador, o mapa inteiro
function visaoInicial(origem) {
  if (origem && window.innerWidth < 700) {
    const c = { x: origem.x + origem.w / 2, y: origem.y + origem.h / 2 }
    return { caixa: { x: c.x - 260, y: c.y - 260, w: 520, h: 520 } }
  }
  return { caixa: MAPA_INTEIRO }
}

function Icone({ local, tamanho = 28 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" className="icone-lista">
      <circle cx="12" cy="12" r="12" fill={dados.categorias[local.categoria].cor} />
      <path d={iconeDe(local)} transform="translate(4.8 4.8) scale(.6)" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function App() {
  const [origem, setOrigem] = useState(() => buscarLocal(params.get('aqui')))
  const [rota, setRota] = useState(null)
  const [atalho, setAtalho] = useState(null)
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [modoStreetView, setModoStreetView] = useState(false)
  const [foco, setFoco] = useState(() => visaoInicial(buscarLocal(params.get('aqui'))))
  const [margem, setMargem] = useState({ topo: 0, baixo: 0 })
  const topoRef = useRef(null)
  const painelRef = useRef(null)

  // mede a busca e o painel para o mapa não ficar escondido atrás deles
  useEffect(() => {
    const medir = () => setMargem({ topo: topoRef.current.offsetHeight + 6, baixo: painelRef.current.offsetHeight + 6 })
    const obs = new ResizeObserver(medir)
    obs.observe(topoRef.current)
    obs.observe(painelRef.current)
    return () => obs.disconnect()
  }, [])

  // escolhe um lugar; "mostrar" enquadra a rota (quando veio da lista ou da busca)
  function escolher(local, mostrar) {
    setBusca('')
    setBuscando(false)
    if (!origem) {
      setOrigem(local)
      if (mostrar) setFoco(visaoInicial(local))
      return
    }
    if (local.nome === origem.nome) return
    const r = calcularRota(dados, grafo, origem, grupos[local.nome])
    setRota(r)
    setAtalho(null)
    if (mostrar && r) setFoco({ caixa: caixaEmVolta([origem, r.destino], r.pontos) })
  }

  const atalhoAtivo = ATALHOS.find((a) => a.nome === atalho)
  const destaque = atalhoAtivo ? new Set(dados.locais.filter(atalhoAtivo.teste).map((l) => l.id)) : null
  const nomesDoAtalho = atalhoAtivo ? nomes.filter((n) => atalhoAtivo.teste(grupos[n][0])) : []

  const termo = semAcento(busca.trim())
  const resultados = nomes.filter((nome) => {
    const l = grupos[nome][0]
    return semAcento(nome).includes(termo) || (l.dica && semAcento(l.dica).includes(termo))
  })

  function Linha({ nome }) {
    const l = grupos[nome][0]
    return (
      <li>
        <button onClick={() => escolher(l, true)}>
          <Icone local={l} />
          <span className="linha-texto">
            <span>{nome}</span>
            <small>{grupos[nome].length > 1 ? `${grupos[nome].length} lugares · vai para o mais perto` : (l.dica || regiao(l))}</small>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="app">
      <Mapa
        foco={foco}
        margem={margem}
        pontos={rota?.pontos}
        origem={origem}
        destino={rota?.destino}
        destaque={destaque}
        aoTocar={(id) => escolher(buscarLocal(id), false)}
        aoLimpar={() => setRota(null)}
        modoStreetView={modoStreetView}
        aoAlternarStreetView={() => setModoStreetView((m) => !m)}
        aoTocarPonto={(p) => { setModoStreetView(false); abrir(streetViewDoPonto(p)) }}
        editor={editor}
      />

      {/* busca */}
      <div className="topo" ref={topoRef}>
        <label className="barra">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input
            type="search"
            placeholder={origem ? 'Buscar no Inventum' : 'Onde você está?'}
            value={busca}
            onFocus={() => setBuscando(true)}
            onChange={(e) => { setBusca(e.target.value); setBuscando(true) }}
          />
          {buscando && <button type="button" className="cancelar" onClick={() => { setBusca(''); setBuscando(false) }}>Cancelar</button>}
        </label>
        {modoStreetView && !buscando && (
          <div className="aviso-street" role="status">
            <span>Toque no mapa onde você quer ver o Street View.</span>
            <button onClick={() => setModoStreetView(false)}>Cancelar</button>
          </div>
        )}
        {buscando && (
          <ul className="lista resultados">
            {resultados.map((nome) => <Linha key={nome} nome={nome} />)}
            {!resultados.length && <li className="vazio">Nenhum lugar com esse nome. Tente outra palavra.</li>}
          </ul>
        )}
      </div>

      {/* painel de baixo */}
      <section className="painel" ref={painelRef}>
        <div className="alca" aria-hidden="true" />

        {!origem && (
          <div className="bloco">
            <h1>Onde você está agora?</h1>
            <p className="apoio">Toque no mapa no lugar onde você está, ou busque pelo nome.</p>
          </div>
        )}

        {origem && !rota && (
          <>
            <div className="bloco">
              <p className="local-atual">
                <span className="ponto" /> Você está em <strong>{origem.nome}</strong>
                <button className="trocar" onClick={() => { setOrigem(null); setAtalho(null) }}>Trocar</button>
              </p>
              <h1>Para onde você quer ir?</h1>
              <p className="apoio">Toque no lugar no mapa ou escolha abaixo.</p>
            </div>
            <div className="atalhos" role="tablist">
              {ATALHOS.map((a) => (
                <button key={a.nome} role="tab" aria-selected={atalho === a.nome}
                  className={atalho === a.nome ? 'ativo' : ''}
                  onClick={() => {
                    const ativo = atalho === a.nome ? null : a.nome
                    setAtalho(ativo)
                    // mostra no mapa onde ficam os lugares do atalho
                    if (ativo) setFoco({ caixa: caixaEmVolta(dados.locais.filter(a.teste).concat(origem)) })
                  }}>
                  {a.nome}
                </button>
              ))}
            </div>
            {atalhoAtivo && (
              <ul className="lista lista-painel">
                {nomesDoAtalho.map((nome) => <Linha key={nome} nome={nome} />)}
              </ul>
            )}
          </>
        )}

        {rota && (
          <div className="bloco destino">
            <div className="destino-topo">
              <Icone local={rota.destino} tamanho={40} />
              <div className="destino-texto">
                <h1>{rota.destino.nome}</h1>
                <p className="apoio">{regiao(rota.destino)} · {tempoAPe(rota.pontos)}</p>
              </div>
              <button className="fechar" aria-label="Desmarcar destino" onClick={() => setRota(null)}>×</button>
            </div>
            {rota.destino.dica && <p className="dica">{rota.destino.dica}</p>}
            <p className="apoio">Siga a linha azul a partir de <strong>{origem.nome}</strong>.</p>
            <div className="botoes">
              <button className="principal" onClick={() => setFoco({ caixa: caixaEmVolta([origem, rota.destino], rota.pontos) })}>Ver rota inteira</button>
              <button className="secundario" onClick={() => abrir(streetViewDoLugar(rota.destino))}>Street View</button>
            </div>
          </div>
        )}

        {!rota && (
          <button className="ver-tudo" onClick={() => setFoco({ caixa: MAPA_INTEIRO })}>Ver o mapa todo</button>
        )}
      </section>
    </div>
  )
}
