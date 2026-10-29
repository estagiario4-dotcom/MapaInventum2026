import { useEffect, useRef, useState } from 'react'
import dados from './dados/mapa.json'
import { montarGrafo, calcularRota, pontoDe } from './rota'
import Mapa from './Mapa'
import './App.css'

const grafo = montarGrafo(dados)
const params = new URLSearchParams(window.location.search)
const editor = params.has('editor')

const buscarLocal = (id) => dados.locais.find((l) => l.id === id)
const pavilhao = buscarLocal(dados.pavilhao)
const externos = dados.locais.filter((l) => l.numero).sort((a, b) => a.numero - b.numero)
const internos = dados.locais.filter((l) => l.dentro).sort((a, b) => a.nome.localeCompare(b.nome))

// tempo a pé (andando devagar, no meio do evento)
function tempoAPe(metros) {
  return `${Math.max(1, Math.round(metros / 60))} min a pé`
}

// caixa em volta de alguns pontos (para enquadrar a rota)
function caixaEmVolta(pts) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x: x - 30, y: y - 30, w: Math.max(Math.max(...xs) - x, 200) + 60, h: Math.max(Math.max(...ys) - y, 120) + 60 }
}

// visão perto de onde a pessoa está (ou na área dos estandes)
function visaoPerto(local) {
  const c = local ? pontoDe(dados, local) : { x: 560, y: 400 }
  return { caixa: { x: c.x - 200, y: c.y - 150, w: 400, h: 300 } }
}

// bolinha com o número (igual à do mapa); lugares do Pavilhão mostram o 18 em vermelho
function Numero({ local, grande }) {
  const dentro = local.dentro || local.id === dados.pavilhao
  return (
    <span className={`numero${dentro ? ' numero-pav' : ''}${grande ? ' numero-grande' : ''}`} aria-hidden="true">
      {local.dentro ? pavilhao.numero : local.numero}
    </span>
  )
}

const ondeFica = (l) => (l.dentro ? 'Dentro do Pavilhão (18)' : `Área externa · número ${l.numero}`)

export default function App() {
  const [origem, setOrigem] = useState(() => buscarLocal(params.get('aqui')))
  const [destino, setDestino] = useState(null)
  const [lista, setLista] = useState(false)
  const [passos, setPassos] = useState(false)
  const [aba, setAba] = useState('fora')
  const [foco, setFoco] = useState(() => visaoPerto(buscarLocal(params.get('aqui'))))
  const [margem, setMargem] = useState({ topo: 0, baixo: 0 })
  const painelRef = useRef(null)

  // mede o painel para o mapa não ficar escondido atrás dele
  useEffect(() => {
    const medir = () => setMargem(window.innerWidth >= 700
      ? { topo: 0, baixo: 0, esquerda: painelRef.current.offsetWidth + 24 }
      : { topo: 0, baixo: painelRef.current.offsetHeight })
    const obs = new ResizeObserver(medir)
    obs.observe(painelRef.current)
    return () => obs.disconnect()
  }, [])

  const rota = origem && destino ? calcularRota(dados, grafo, origem, destino) : null
  const caixaDaRota = (o, d, r) => ({ caixa: caixaEmVolta([pontoDe(dados, o), pontoDe(dados, d), ...r.pontos]), manter: pontoDe(dados, o) })

  function limparOrigem() {
    setOrigem(null)
    setDestino(null)
  }

  // toque num lugar: sem origem, vira "você está aqui"; com origem, vira o destino.
  // Tocar de novo no mesmo lugar desmarca.
  // "daLista": veio da lista (enquadra com zoom); do mapa só arrasta, sem mudar o zoom
  function escolher(local, daLista) {
    setLista(false)
    if (origem && local.id === origem.id) return limparOrigem()
    if (destino && local.id === destino.id) return setDestino(null)
    if (!origem) {
      setOrigem(local)
      if (daLista) setFoco(visaoPerto(local))
      return
    }
    setDestino(local)
    setPassos(false)
    const r = calcularRota(dados, grafo, origem, local)
    if (r) setFoco({ ...caixaDaRota(origem, local, r), mover: !daLista })
  }

  function Linha({ local }) {
    const eOrigem = origem && local.id === origem.id
    return (
      <li>
        <button onClick={() => escolher(local, true)} disabled={eOrigem}>
          <Numero local={local} />
          <span className="linha-texto">
            <span>{local.nome}</span>
            <small>{eOrigem ? 'Você está aqui' : ondeFica(local)}</small>
          </span>
        </button>
      </li>
    )
  }

  // passo a passo da rota
  function Passos() {
    if (origem.dentro && destino.dentro) {
      return <p className="aviso">Os dois ficam dentro do Pavilhão. Siga as placas lá dentro.</p>
    }
    const itens = []
    itens.push(origem.dentro
      ? <>Saia do <strong>Pavilhão</strong> pela entrada principal</>
      : <>Saia de <Numero local={origem} /> <strong>{origem.nome}</strong></>)
    if (rota.pontos.length > 1) {
      itens.push(rota.referencias.length
        ? <>Siga a linha azul passando por {rota.referencias.slice(0, 3).map((l, i, t) => (
            <span key={l.id}><Numero local={l} /> {l.nome}{i < t.length - 2 ? ', ' : i === t.length - 2 ? ' e ' : ''}</span>
          ))}</>
        : <>Siga a linha azul</>)
    }
    itens.push(destino.dentro
      ? <>Entre no <Numero local={pavilhao} /> <strong>Pavilhão</strong>. <strong>{destino.nome}</strong> fica lá dentro</>
      : <>Chegue em <Numero local={destino} /> <strong>{destino.nome}</strong></>)
    return (
      <ol className="passos">
        {itens.map((p, i) => <li key={i}><span>{p}</span></li>)}
      </ol>
    )
  }

  return (
    <div className="app">
      <Mapa
        foco={foco}
        margem={margem}
        rota={rota}
        origem={origem}
        destino={destino}
        aoTocar={(id) => escolher(buscarLocal(id), false)}
        aoLimpar={() => setDestino(null)}
        aoLimparOrigem={limparOrigem}
        editor={editor}
      />

      {/* botão para voltar o mapa para onde a pessoa está */}
      {origem && (
        <button className="onde-estou" style={{ bottom: margem.baixo + 12 }} aria-label="Mostrar onde estou"
          onClick={() => setFoco(rota ? caixaDaRota(origem, destino, rota) : visaoPerto(origem))}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* painel de baixo (com a dica do que fazer) */}
      <section className={`painel${lista ? ' aberto' : ''}`} ref={painelRef}>
        {lista ? (
          <>
            <div className="linha-topo">
              <h1>{origem ? 'Para onde você quer ir?' : 'Onde você está?'}</h1>
              <button className="fechar" aria-label="Fechar lista" onClick={() => setLista(false)}>×</button>
            </div>
            <div className="abas" role="tablist">
              <button role="tab" aria-selected={aba === 'fora'} className={aba === 'fora' ? 'ativo' : ''} onClick={() => setAba('fora')}>Área externa</button>
              <button role="tab" aria-selected={aba === 'dentro'} className={aba === 'dentro' ? 'ativo' : ''} onClick={() => setAba('dentro')}>Dentro do Pavilhão</button>
            </div>
            <ul className="lista lista-painel">
              {(aba === 'fora' ? externos : internos).map((l) => <Linha key={l.id} local={l} />)}
            </ul>
          </>
        ) : rota ? (
          <>
            <div className="linha-topo">
              <Numero local={destino} grande />
              <div className="destino-texto">
                <h1>{destino.nome}</h1>
                <p className="apoio">{tempoAPe(rota.metros)} · siga a linha azul</p>
              </div>
              <button className="fechar" aria-label="Desmarcar destino" onClick={() => setDestino(null)}>×</button>
            </div>
            {passos && <Passos />}
            <button className="link" aria-expanded={passos} onClick={() => setPassos(!passos)}>
              {passos ? 'Esconder o passo a passo' : 'Ver o passo a passo'}
            </button>
          </>
        ) : (
          <>
            {origem && (
              <div className="linha-topo voce">
                <span className="ponto" />
                <p>Você está em <Numero local={origem} /> <strong>{origem.nome}</strong></p>
                <button className="fechar pequeno" aria-label="Desmarcar onde você está" onClick={limparOrigem}>×</button>
              </div>
            )}
            <p className="dica-uso">
              <span className="dica-passo">{origem ? '2 de 2' : '1 de 2'}</span>
              <span>
                <strong>{origem ? 'Toque no número para onde você quer ir.' : 'Toque no número do lugar onde você está.'}</strong>
                <small>{origem ? 'Pode tocar no número ou no nome do lugar.' : 'Arraste o mapa e use dois dedos para aproximar.'}</small>
              </span>
            </p>
            <button className="link" onClick={() => setLista(true)}>Ou escolha na lista</button>
          </>
        )}
      </section>
    </div>
  )
}
