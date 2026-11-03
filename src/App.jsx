import { useEffect, useRef, useState } from 'react'
import dados from './dados/mapa.json'
import { pontoDe } from './rota'
import Mapa, { ICONES } from './Mapa'
import programacao, { atividadesDe, hojeISO, temProgramacao } from './programacao'
import './App.css'

const params = new URLSearchParams(window.location.search)
const editor = params.has('editor')

const buscarLocal = (id) => dados.locais.find((l) => l.id === id)
const pavilhao = buscarLocal(dados.pavilhao)
const externos = dados.locais.filter((l) => l.numero).sort((a, b) => a.numero - b.numero)
// pontos de fora sem número (ex.: hidratação)
const extras = dados.locais.filter((l) => !l.numero && !l.dentro)
const internos = dados.locais.filter((l) => l.dentro).sort((a, b) => a.nome.localeCompare(b.nome))

// visão perto de onde a pessoa está (ou na área dos estandes)
function visaoPerto(local) {
  // no celular, mais perto (dá para ler os números); no computador, uma área maior
  const c = local ? pontoDe(dados, local) : { x: 600, y: 360 }
  const w = window.innerWidth < 700 ? 230 : 400
  return { caixa: { x: c.x - w / 2, y: c.y - w * 0.375, w, h: w * 0.75 } }
}

// Ao abrir o mapa os patrocinadores aparecem sem nada por cima:
// no computador, o mapa em tela cheia (painel à direita); no celular, o quadro dos patrocinadores.
const PATROCINADORES = { x: 20, y: 530, w: 500, h: 250 }
const celular = () => window.innerWidth < 700
function visaoAbertura() {
  if (!celular()) return { inteiro: true }
  return { caixa: PATROCINADORES, depois: true }
}

const DIAS = { '2026-11-04': 'Qua 04/11', '2026-11-05': 'Qui 05/11', '2026-11-06': 'Sex 06/11', '2026-11-07': 'Sáb 07/11', '2026-11-08': 'Dom 08/11' }

function Agenda({ local }) {
  const lista = atividadesDe(local)
  const hoje = hojeISO()
  const dias = [...new Set(lista.map((a) => a.dia))]
  // quando o número junta mais de um espaço (ex.: Auditório e Mini Auditório), mostra em qual é cada atividade
  const varios = new Set(programacao.atividades.filter((a) => a.local === local.id).map((a) => a.localNoSite)).size > 1
  if (!lista.length) {
    const tinha = programacao.atividades.some((a) => a.local === local.id)
    return <p className="aviso">{tinha ? 'Não há mais programação para este lugar.' : 'Ainda não há programação cadastrada para este lugar.'}</p>
  }
  return (
    <div className="agenda">
      {dias.map((dia) => (
        <div key={dia}>
          <p className="agenda-dia">{dia === hoje ? 'Hoje' : DIAS[dia] || dia}</p>
          <ul>
            {lista.filter((a) => a.dia === dia).map((a, i) => (
              <li key={i}>
                <span className="agenda-hora">{a.inicio ? (a.fim ? `${a.inicio}–${a.fim}` : a.inicio) : 'A definir'}</span>
                <span className="agenda-texto">{varios && a.localNoSite && <em className="agenda-onde">{a.localNoSite}</em>}<strong>{a.titulo}</strong><small>{a.tipo}{a.com ? ` · ${a.com}` : ''}</small></span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <a className="agenda-site" href="https://inventum.org.br/programacao" target="_blank" rel="noreferrer">Programação completa e inscrições</a>
    </div>
  )
}

// bolinha com o número (igual à do mapa); lugares do Pavilhão mostram o número do Pavilhão em vermelho
// (pontos sem número, como a hidratação, mostram uma gota)
function Numero({ local, grande }) {
  const dentro = local.dentro || local.id === dados.pavilhao
  // pontos de fora sem número (hidratação, Espaço Inovação) mostram o ícone
  const icone = !local.numero && !local.dentro && local.icone
  return (
    <span className={`numero${dentro ? ' numero-pav' : ''}${local.icone === 'agua' ? ' numero-agua' : ''}${grande ? ' numero-grande' : ''}`} aria-hidden="true">
      {icone
        ? <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONES[icone]} /></svg>
        : local.dentro ? pavilhao.numero : local.numero}
    </span>
  )
}

// o selo de programação (o mesmo que aparece nos lugares do mapa)
const Selo = () => (
  <svg className="selo-mini" viewBox="-12 -12 24 24" aria-label="selo de programação" role="img">
    <circle r="10.5" className="selo-fundo" />
    <path d={ICONES.agenda} transform="translate(-6.5 -6.5) scale(.54)" className="selo-icone" />
  </svg>
)

const ondeFica = (l) => (l.dentro ? `Dentro do Pavilhão (${pavilhao.numero})` : l.numero ? `Área externa · número ${l.numero}` : l.junto ? `Área externa · no prédio do número ${l.junto}` : 'Área externa')

export default function App() {
  const [escolhido, setEscolhido] = useState(null)
  const [lista, setLista] = useState(false)
  const [aba, setAba] = useState('fora')
  const [foco, setFoco] = useState(visaoAbertura)
  const [margem, setMargem] = useState({ topo: 0, baixo: 0 })
  const painelRef = useRef(null)

  // mede o painel para o mapa não ficar escondido atrás dele
  useEffect(() => {
    const medir = () => setMargem(window.innerWidth >= 700
      ? { topo: 0, baixo: 0, direita: painelRef.current.offsetWidth + 24, alturaPainel: painelRef.current.offsetHeight + 24 }
      : { topo: 0, baixo: painelRef.current.offsetHeight })
    const obs = new ResizeObserver(medir)
    obs.observe(painelRef.current)
    return () => obs.disconnect()
  }, [])

  // toque num lugar: mostra a programação dele. Tocar de novo no mesmo lugar desmarca.
  // "daLista": veio da lista (leva o mapa até o lugar); do mapa, o mapa fica onde está
  function escolher(local, daLista) {
    setLista(false)
    if (escolhido && local.id === escolhido.id) return setEscolhido(null)
    setEscolhido(local)
    const alvo = local.ponto || pontoDe(dados, local)
    if (!daLista) setFoco({ caixa: { x: alvo.x - 1, y: alvo.y - 1, w: 2, h: 2 }, manter: alvo, soManter: true })
    else if (local.dentro && local.x != null) setFoco({ pavilhao: true, centro: alvo })
    else setFoco({ caixa: { x: alvo.x - 130, y: alvo.y - 100, w: 260, h: 200 }, manter: alvo })
  }

  function Linha({ local }) {
    const n = atividadesDe(local).length
    return (
      <li>
        <button onClick={() => escolher(local, true)}>
          <Numero local={local} />
          <span className="linha-texto">
            <span>{local.nome}</span>
            <small>{ondeFica(local)}{n ? ` · ${n} atividade${n > 1 ? 's' : ''}` : ''}</small>
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
        rota={null}
        origem={null}
        destino={escolhido}
        aoTocar={(id) => escolher(buscarLocal(id), false)}
        aoLimpar={() => setEscolhido(null)}
        aoLimparOrigem={() => {}}
        aoFimAbertura={() => {}}
        editor={editor}
      />

      {/* painel de baixo */}
      <section className={`painel${lista ? ' aberto' : ''}`} ref={painelRef}>
        {lista ? (
          <>
            <div className="linha-topo">
              <h1>Ver a programação de</h1>
              <button className="fechar" aria-label="Fechar lista" onClick={() => setLista(false)}>×</button>
            </div>
            <div className="abas" role="tablist">
              <button role="tab" aria-selected={aba === 'fora'} className={aba === 'fora' ? 'ativo' : ''} onClick={() => setAba('fora')}>Área externa</button>
              <button role="tab" aria-selected={aba === 'dentro'} className={aba === 'dentro' ? 'ativo' : ''} onClick={() => setAba('dentro')}>Dentro do Pavilhão</button>
            </div>
            <ul className="lista lista-painel">
              {(aba === 'fora' ? [...externos, ...extras] : internos).filter(temProgramacao).map((l) => <Linha key={l.id} local={l} />)}
            </ul>
          </>
        ) : escolhido ? (
          <>
            <div className="linha-topo">
              <Numero local={escolhido} grande />
              <div className="destino-texto">
                <h1>{escolhido.nome}</h1>
                <p className="apoio">{ondeFica(escolhido)}</p>
              </div>
              <button className="fechar" aria-label="Fechar" onClick={() => setEscolhido(null)}>×</button>
            </div>
            {escolhido.icone === 'agua'
              ? <p className="aviso">Ponto de hidratação.</p>
              : <Agenda local={escolhido} />}
          </>
        ) : (
          <>
            <p className="dica-uso">
              <span>
                <strong>Toque nos lugares com <Selo /> para ver a programação.</strong>
                <small>Arraste o mapa; dois toques ou dois dedos aproximam.</small>
              </span>
            </p>
            <div className="acoes">
              <button className="link" onClick={() => setLista(true)}>Escolher na lista</button>
              <button className="link vermelho" onClick={() => setFoco({ pavilhao: true })}>Ver atrações do Pavilhão</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
