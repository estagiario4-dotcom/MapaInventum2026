import { useEffect, useRef, useState } from 'react'
import dados from './dados/mapa.json'
import { pontoDe } from './rota'

const IMG = dados.imagem
export const MAPA_INTEIRO = { x: 0, y: 0, w: IMG.largura, h: IMG.altura }
const numerados = dados.locais.filter((l) => l.numero)
const linha = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ')
const numeroDe = (l) => (l.dentro ? dados.locais.find((p) => p.id === dados.pavilhao).numero : l.numero)

// bolinha com o número, desenhada por cima do número da imagem (tamanho fixo na tela)
function Marcador({ p, px, cor, texto, pulso }) {
  return (
    <g className="sem-toque" transform={`translate(${p.x} ${p.y}) scale(${px})`}>
      {pulso && <circle r="26" fill={cor} fillOpacity=".3" className="pulso" />}
      <circle r="19" fill={cor} stroke="#fff" strokeWidth="4" />
      <text className="marcador-num" fontSize={String(texto).length > 1 ? 16 : 19}>{texto}</text>
    </g>
  )
}

export default function Mapa({ foco, margem, rota, origem, destino, aoTocar, aoLimpar, aoLimparOrigem, editor }) {
  const caixa = useRef(null)
  const ponteiros = useRef(new Map())
  const gesto = useRef(null)
  const rotulosNaTela = useRef([])
  const [tam, setTam] = useState({ w: 0, h: 0 })
  const [vb, setVb] = useState(null)
  const [clique, setClique] = useState(null)

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setTam({ w: e.contentRect.width, h: e.contentRect.height }))
    obs.observe(caixa.current)
    return () => obs.disconnect()
  }, [])

  // o mapa ocupa a tela toda: não afasta além da imagem.
  // Pode arrastar um pouco além da borda só o suficiente para nada ficar escondido atrás do painel.
  function limitar(v) {
    const maxW = Math.min(IMG.largura, IMG.altura * (tam.w / tam.h))
    const cx = v.x + v.w / 2
    const cy = v.y + v.h / 2
    const w = Math.min(Math.max(v.w, 120), maxW)
    const h = w * (tam.h / tam.w)
    const k = w / tam.w
    const topo = (margem?.topo || 0) * k
    const baixo = (margem?.baixo || 0) * k
    const esquerda = (margem?.esquerda || 0) * k
    const x = Math.min(Math.max(cx - w / 2, -esquerda), IMG.largura - w)
    const y = Math.min(Math.max(cy - h / 2, -topo), IMG.altura - h + baixo)
    return { x, y, w, h }
  }

  // enquadra uma caixa do mapa na parte livre da tela (acima do painel)
  // "manter": ponto que precisa aparecer quando a caixa não cabe na tela (ex.: onde a pessoa está)
  // "mover": só arrasta o mapa até a caixa, sem mudar o zoom
  function enquadrar(b, manter, mover) {
    const topo = margem?.topo || 0
    const baixo = margem?.baixo || 0
    const esquerda = margem?.esquerda || 0
    const livreH = Math.max(tam.h - topo - baixo, 120)
    const livreW = Math.max(tam.w - esquerda - 24, 120)
    // escala (unidades do mapa por pixel), sem passar do zoom máximo e do mínimo
    const maxEscala = Math.min(IMG.largura, IMG.altura * (tam.w / tam.h)) / tam.w
    const escala = mover && vb ? vb.w / tam.w
      : Math.min(Math.max(Math.max(b.w / livreW, b.h / livreH) * 1.08, 120 / tam.w), maxEscala)
    let v = {
      x: b.x + b.w / 2 - (esquerda + 12 + livreW / 2) * escala,
      y: b.y + b.h / 2 - (topo + livreH / 2) * escala,
      w: tam.w * escala,
      h: tam.h * escala,
    }
    if (manter) {
      const folga = 60 * escala
      const x1 = v.x + esquerda * escala + folga
      const x2 = v.x + v.w - folga
      const y1 = v.y + topo * escala + folga
      const y2 = v.y + v.h - baixo * escala - folga
      const dx = manter.x < x1 ? manter.x - x1 : manter.x > x2 ? manter.x - x2 : 0
      const dy = manter.y < y1 ? manter.y - y1 : manter.y > y2 ? manter.y - y2 : 0
      v = { ...v, x: v.x + dx, y: v.y + dy }
    }
    // não mostra faixa vazia embaixo da imagem se não precisar
    const yMax = Math.max(IMG.altura - v.h, b.y + b.h - (v.h - baixo * escala))
    v = limitar({ ...v, y: Math.min(v.y, yMax) })
    setVb(v)
  }

  useEffect(() => {
    if (tam.w && foco) enquadrar(foco.caixa, foco.manter, foco.mover)
    // refaz quando o painel muda de tamanho, para a rota não ficar escondida atrás dele
  }, [foco, tam.w, tam.h, margem?.baixo, margem?.esquerda]) // eslint-disable-line react-hooks/exhaustive-deps

  function zoomEm(px, py, fator) {
    setVb((v) => {
      const mx = v.x + (px / tam.w) * v.w
      const my = v.y + (py / tam.h) * v.h
      return limitar({ x: mx - (mx - v.x) * fator, y: my - (my - v.y) * fator, w: v.w * fator, h: v.h * fator })
    })
  }

  useEffect(() => {
    const el = caixa.current
    function roda(e) {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomEm(e.clientX - r.left, e.clientY - r.top, e.deltaY > 0 ? 1.15 : 1 / 1.15)
    }
    el.addEventListener('wheel', roda, { passive: false })
    return () => el.removeEventListener('wheel', roda)
  })

  function pos(e) {
    const r = caixa.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function aoPressionar(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    ponteiros.current.set(e.pointerId, pos(e))
    if (ponteiros.current.size === 1) gesto.current = { inicio: pos(e), moveu: false }
    else if (gesto.current) gesto.current.moveu = true
  }

  function aoMover(e) {
    const antes = ponteiros.current.get(e.pointerId)
    if (!antes || !vb) return
    const agora = pos(e)
    ponteiros.current.set(e.pointerId, agora)
    if (ponteiros.current.size === 1) {
      const g = gesto.current
      if (g && Math.hypot(agora.x - g.inicio.x, agora.y - g.inicio.y) > 8) g.moveu = true
      if (!g?.moveu) return
      const dx = ((agora.x - antes.x) / tam.w) * vb.w
      const dy = ((agora.y - antes.y) / tam.h) * vb.h
      setVb((v) => limitar({ ...v, x: v.x - dx, y: v.y - dy }))
    } else if (ponteiros.current.size === 2) {
      const outro = [...ponteiros.current.entries()].find(([id]) => id !== e.pointerId)[1]
      const distAntes = Math.hypot(antes.x - outro.x, antes.y - outro.y)
      const distAgora = Math.hypot(agora.x - outro.x, agora.y - outro.y)
      if (distAgora > 0) zoomEm((agora.x + outro.x) / 2, (agora.y + outro.y) / 2, distAntes / distAgora)
    }
  }

  function aoSoltar(e) {
    ponteiros.current.delete(e.pointerId)
    if (ponteiros.current.size > 0) return
    const g = gesto.current
    gesto.current = null
    if (!g || g.moveu || !vb) return
    const p = pos(e)
    const ponto = { x: vb.x + (p.x / tam.w) * vb.w, y: vb.y + (p.y / tam.h) * vb.h }
    if (editor) setClique({ x: Math.round(ponto.x), y: Math.round(ponto.y) })
    // toque num nome escolhe esse lugar
    const nome = rotulosNaTela.current.find((r) => p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2)
    if (nome) return aoTocar(nome.id)
    // toque perto de um número escolhe esse lugar
    const raio = Math.max(26, 26 * (vb.w / tam.w))
    let perto = null
    for (const l of numerados) {
      const d = Math.hypot(l.x - ponto.x, l.y - ponto.y)
      if (d < raio && (!perto || d < perto.d)) perto = { l, d }
    }
    if (perto) aoTocar(perto.l.id)
  }

  // 1 pixel da tela em unidades do mapa
  const px = vb ? vb.w / tam.w : 1
  const naTela = (p) => ({ x: ((p.x - vb.x) / vb.w) * tam.w, y: ((p.y - vb.y) / vb.h) * tam.h })

  const pOrigem = origem ? pontoDe(dados, origem) : null
  const pDestino = destino ? pontoDe(dados, destino) : null
  const pontos = rota?.pontos

  // etiqueta do destino (com X), presa em cima do número
  let etiqueta = null
  if (vb && pDestino) {
    const t = naTela(pDestino)
    etiqueta = { x: Math.min(Math.max(t.x, 110), tam.w - 110), y: Math.max(t.y, (margem?.topo || 0) + 60) }
  }

  // nomes curtos ao lado de cada número, sem cobrir outros números nem outros nomes
  const rotulos = []
  if (vb) {
    const R = 16 / px + 2 // raio do número da imagem, em pixels da tela
    const ocupado = numerados.map((l) => {
      const t = naTela(l)
      return { x1: t.x - R, x2: t.x + R, y1: t.y - R, y2: t.y + R }
    })
    if (pOrigem) {
      const t = naTela(pOrigem)
      const x = Math.min(Math.max(t.x, 80), tam.w - 80)
      ocupado.push({ x1: x - 75, x2: x + 75, y1: t.y + 28, y2: t.y + 64 })
    }
    if (etiqueta) {
      const larg = Math.min(destino.nome.length * 8 + 56, 230)
      ocupado.push({ x1: etiqueta.x - larg / 2, x2: etiqueta.x + larg / 2, y1: etiqueta.y - 72, y2: etiqueta.y - 26 })
    }
    const livre = (r) => r.x1 >= 4 && r.x2 <= tam.w - 4 && r.y1 >= 4 && r.y2 <= tam.h - (margem?.baixo || 0) - 4
      && !ocupado.some((o) => r.x1 < o.x2 && r.x2 > o.x1 && r.y1 < o.y2 && r.y2 > o.y1)
    const ordem = [...numerados].sort((a, b) => (origem?.id === b.id) - (origem?.id === a.id) || a.numero - b.numero)
    for (const l of ordem) {
      if (destino && l.id === destino.id) continue // o destino já tem a etiqueta com o nome
      const t = naTela(l)
      if (t.x < -100 || t.x > tam.w + 100 || t.y < -40 || t.y > tam.h + 40) continue
      const w = l.rotulo.length * 6.4 + 14
      const h = 20
      const opcoes = [
        { x1: t.x + R + 2, y1: t.y - h / 2 }, // à direita
        { x1: t.x - w / 2, y1: t.y + R + 1 }, // embaixo
        { x1: t.x - R - 2 - w, y1: t.y - h / 2 }, // à esquerda
        { x1: t.x - w / 2, y1: t.y - R - 1 - h }, // em cima
      ].map((o) => ({ ...o, x2: o.x1 + w, y2: o.y1 + h }))
      const r = opcoes.find(livre)
      if (!r) continue
      ocupado.push(r)
      rotulos.push({ ...r, id: l.id, texto: l.rotulo, pav: l.id === dados.pavilhao })
    }
  }
  rotulosNaTela.current = rotulos

  return (
    <div className="mapa" ref={caixa}>
      {vb && (
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        >
          <image href={IMG.arquivo} x="0" y="0" width={IMG.largura} height={IMG.altura} preserveAspectRatio="none" />

          {/* deixa o resto do mapa mais apagado quando tem rota, para a linha aparecer */}
          {pontos && <rect x="0" y="0" width={IMG.largura} height={IMG.altura} className="veu" />}

          {editor && dados.caminhos.map(([a, b]) => (
            <line key={a + b} className="corredor" strokeWidth={2 * px}
              x1={dados.nos[a].x} y1={dados.nos[a].y} x2={dados.nos[b].x} y2={dados.nos[b].y} />
          ))}
          {editor && numerados.map((l) => (
            <line key={l.id} className="ligacao" strokeWidth={1.5 * px}
              x1={l.x} y1={l.y} x2={dados.nos[l.no].x} y2={dados.nos[l.no].y} />
          ))}

          {/* rota: do número de origem até o número de destino */}
          {pontos && (() => {
            const tudo = [pOrigem, ...pontos, pDestino]
            return (
              <>
                <polyline className="rota-borda" points={linha(tudo)} />
                <polyline className="rota" points={linha(tudo)} />
                <polyline className="rota-setas" points={linha(tudo)} />
              </>
            )
          })()}

          {/* destino: número em vermelho, por cima da linha */}
          {pDestino && <Marcador p={pDestino} px={px} cor="var(--destino)" texto={numeroDe(destino)} />}

          {/* você está aqui: número em azul, pulsando */}
          {pOrigem && <Marcador p={pOrigem} px={px} cor="var(--voce)" texto={numeroDe(origem)} pulso />}

          {editor && Object.entries(dados.nos).map(([id, n]) => (
            <g key={id}>
              <circle cx={n.x} cy={n.y} r={3 * px} fill="#ffeb3b" />
              <text className="no-id" x={n.x + 4 * px} y={n.y - 4 * px} fontSize={11 * px}>{id}</text>
            </g>
          ))}
        </svg>
      )}

      {/* nomes dos números */}
      {rotulos.map((r) => (
        <div key={r.id} className={`rotulo${r.pav ? ' rotulo-pav' : ''}`} style={{ left: r.x1, top: r.y1 }}>{r.texto}</div>
      ))}

      {/* "Você está aqui" sempre legível */}
      {vb && pOrigem && (() => {
        const t = naTela(pOrigem)
        return (
          <div className="voce-aqui" style={{ left: Math.min(Math.max(t.x, 80), tam.w - 80), top: t.y }}>
            <span>Você está aqui</span>
            <button aria-label="Desmarcar onde você está" onClick={aoLimparOrigem}>×</button>
          </div>
        )
      })()}

      {/* etiqueta do destino, com X para desmarcar */}
      {etiqueta && (
        <div className="etiqueta" style={{ left: etiqueta.x, top: etiqueta.y }}>
          <span>{destino.nome}</span>
          <button aria-label="Desmarcar destino" onClick={aoLimpar}>×</button>
        </div>
      )}

      <div className="controles" style={{ bottom: (margem?.baixo || 0) + 12 }}>
        <button aria-label="Aproximar" onClick={() => zoomEm(tam.w / 2, tam.h / 2, 1 / 1.6)}>+</button>
        <button aria-label="Afastar" onClick={() => zoomEm(tam.w / 2, tam.h / 2, 1.6)}>−</button>
      </div>

      {editor && clique && <div className="coordenadas">x: {clique.x}, y: {clique.y}</div>}
    </div>
  )
}
