import { useEffect, useMemo, useRef, useState } from 'react'
import dados from './dados/mapa.json'

const M = dados.mapa
const C = dados.chao
export const MAPA_INTEIRO = { x: M.x0, y: M.y0, w: M.largura, h: M.altura }
const centro = (l) => ({ x: l.x + l.w / 2, y: l.y + l.h / 2 })
const lista = (pts) => pts.map((p) => p.join(',')).join(' ')

// ---------- ícones (desenhados em 24x24, traço branco) ----------
const ICONES = {
  estande: 'M4 10h16v10H4zM3 5h18l-1.2 5H4.2zM10 20v-5h4v5',
  atracao: 'M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4.1-4 5.7-.8z',
  palco: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  alimentacao: 'M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M16 3c-2.5 2-2.5 7 0 8.5V21',
  servico: 'M12 8v.5M12 11v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  acesso: 'M4 12h11M11 7l5 5-5 5M20 4v16',
  banheiro: 'M7 5.5a1.5 1.5 0 1 0 0-.01M5 9h4l-.5 6H8v5H6v-5h-.5zM17 5.5a1.5 1.5 0 1 0 0-.01M15.5 9h3l1.5 6h-2v5h-2v-5h-2zM12 4v16',
}
export const iconeDe = (l) => (l.nome === 'Banheiros' ? ICONES.banheiro : ICONES[l.categoria])

// ---------- textos com tamanho fixo na tela ----------
const FONTE = 11.5 // px
const largTexto = (t) => t.length * FONTE * 0.56

// quebra o nome em até 2 linhas que caibam em "max" pixels
function linhasQueCabem(nome, max) {
  if (largTexto(nome) <= max) return [nome]
  const palavras = nome.split(' ')
  for (let i = palavras.length - 1; i > 0; i--) {
    const a = palavras.slice(0, i).join(' ')
    const b = palavras.slice(i).join(' ')
    if (largTexto(a) <= max && largTexto(b) <= max) return [a, b]
  }
  return null
}

// rótulo de rua: no meio do trecho mais comprido, sempre em pé
function rotuloDaRua(pontos) {
  let melhor = null
  for (let i = 0; i < pontos.length - 1; i++) {
    const [x1, y1] = pontos[i]
    const [x2, y2] = pontos[i + 1]
    const tam = Math.hypot(x2 - x1, y2 - y1)
    if (!melhor || tam > melhor.tam) {
      let ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
      if (ang > 90) ang -= 180
      if (ang <= -90) ang += 180
      melhor = { tam, x: (x1 + x2) / 2, y: (y1 + y2) / 2, ang }
    }
  }
  return melhor
}

// tudo o que não muda: chão, matas, ruas, pista, prédios e pavilhão (geometria do OpenStreetMap)
function Chao() {
  const pav = C.pavilhao
  return (
    <>
      <polygon className="parque" points={lista(C.parque)} />
      {C.areas.map((a, i) => <polygon key={i} className={`area area-${a.tipo}`} points={lista(a.pontos)} />)}
      {C.matas.map((m, i) => <polygon key={i} points={lista(m)} fill="url(#mata)" className="mata" />)}

      <polyline className="pista-borda" points={lista(C.pista)} />
      <polyline className="pista" points={lista(C.pista)} />

      {C.ruas.filter((r) => r.tipo === 'interna').map((r, i) => (
        <g key={i}>
          <polyline className="caminho-borda" points={lista(r.pontos)} strokeWidth={r.largura + 4} />
          <polyline className="caminho" points={lista(r.pontos)} strokeWidth={r.largura} />
        </g>
      ))}
      {C.ruas.filter((r) => r.tipo === 'rua').map((r, i) => (
        <polyline key={i} className="rua-borda" points={lista(r.pontos)} strokeWidth={r.largura + 6} />
      ))}
      {C.ruas.filter((r) => r.tipo === 'rua').map((r, i) => (
        <polyline key={i} className="rua" points={lista(r.pontos)} strokeWidth={r.largura} />
      ))}

      {C.cercas.map((c, i) => <polyline key={i} className="cerca" points={lista(c)} />)}
      {C.predios.map((pr, i) => <polygon key={i} className="predio" points={lista(pr.pontos)} />)}

      <polygon className="pav-parede" points={lista(pav.parede)} />
      <polygon className="pav-piso" points={lista(pav.piso)} />
      <polygon className="pav-saguao" points={lista(pav.saguao)} />
    </>
  )
}

export default function Mapa({ foco, margem, pontos, origem, destino, destaque, aoTocar, aoLimpar, modoStreetView, aoAlternarStreetView, aoTocarPonto, editor }) {
  const caixa = useRef(null)
  const ponteiros = useRef(new Map())
  const gesto = useRef(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  const [vb, setVb] = useState(null)
  const [clique, setClique] = useState(null)
  const chao = useMemo(() => <Chao />, [])

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setTam({ w: e.contentRect.width, h: e.contentRect.height }))
    obs.observe(caixa.current)
    return () => obs.disconnect()
  }, [])

  // enquadra uma caixa do mapa na parte livre da tela (entre a busca e o painel)
  function enquadrar(b) {
    const topo = margem?.topo || 0
    const baixo = margem?.baixo || 0
    const livreH = Math.max(tam.h - topo - baixo, 120)
    const escala = Math.max(b.w / (tam.w - 24), b.h / livreH) * 1.08
    setVb({
      x: b.x + b.w / 2 - (tam.w / 2) * escala,
      y: b.y + b.h / 2 - (topo + livreH / 2) * escala,
      w: tam.w * escala,
      h: tam.h * escala,
    })
  }

  useEffect(() => {
    if (tam.w && foco) enquadrar(foco.caixa)
  }, [foco, tam.w, tam.h]) // eslint-disable-line react-hooks/exhaustive-deps

  function zoomEm(px, py, fator) {
    setVb((v) => {
      const w = Math.min(Math.max(v.w * fator, 60), M.largura * 1.6)
      const f = w / v.w
      const mx = v.x + (px / tam.w) * v.w
      const my = v.y + (py / tam.h) * v.h
      return { x: mx - (mx - v.x) * f, y: my - (my - v.y) * f, w, h: v.h * f }
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
      setVb((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
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
    if (!g || g.moveu) return
    // modo Street View: o toque escolhe um ponto do mapa, não um lugar
    if (modoStreetView && vb) {
      const p = pos(e)
      aoTocarPonto({ x: vb.x + (p.x / tam.w) * vb.w, y: vb.y + (p.y / tam.h) * vb.h })
      return
    }
    const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-local]')
    if (alvo) aoTocar(alvo.dataset.local)
    if (editor && vb) {
      const p = pos(e)
      setClique({ x: Math.round(vb.x + (p.x / tam.w) * vb.w), y: Math.round(vb.y + (p.y / tam.h) * vb.h) })
    }
  }

  // 1 pixel da tela em unidades do mapa
  const px = vb ? vb.w / tam.w : 1
  const naTela = (p) => ({ x: ((p.x - vb.x) / vb.w) * tam.w, y: ((p.y - vb.y) / vb.h) * tam.h })

  const pontoOrigem = origem ? (pontos ? pontos[0] : centro(origem)) : null
  const pontoDestino = destino ? (pontos ? pontos[pontos.length - 1] : centro(destino)) : null


  // decide onde vai cada nome: dentro do bloco, embaixo do ícone, ou some (sem sobrepor)
  const rotulos = []
  if (vb) {
    const ocupado = []
    const livre = (r) => !ocupado.some((o) => r.x1 < o.x2 && r.x2 > o.x1 && r.y1 < o.y2 && r.y2 > o.y1)
    const prioridade = (l) => (destino && l.id === destino.id ? 1e12 : 0) + (origem && l.id === origem.id ? 1e11 : 0)
      + (destaque?.has(l.id) ? 1e10 : 0) + l.w * l.h
    const visiveis = dados.locais.filter((l) => l.x + l.w > vb.x && l.x < vb.x + vb.w && l.y + l.h > vb.y && l.y < vb.y + vb.h)
    for (const l of visiveis.sort((a, b) => prioridade(b) - prioridade(a))) {
      const cx = l.texto ? l.texto[0] + l.texto[2] / 2 : l.x + l.w / 2
      const cy = l.texto ? l.texto[1] + l.texto[3] / 2 : l.y + l.h / 2
      const wPx = (l.texto ? l.texto[2] : l.w) / px
      const hPx = (l.texto ? l.texto[3] : l.h) / px
      const t = naTela({ x: cx, y: cy })
      const base = { id: l.id, cor: dados.categorias[l.categoria].cor, apagado: destaque && !destaque.has(l.id), ativo: destino && l.id === destino.id }

      // 1) cabe dentro do bloco
      const dentro = hPx >= 18 ? linhasQueCabem(l.nome, wPx - 8) : null
      if (dentro && (dentro.length === 1 || hPx >= 32)) {
        const alt = dentro.length * FONTE * 1.2
        const larg = Math.max(...dentro.map(largTexto))
        ocupado.push({ x1: t.x - larg / 2, x2: t.x + larg / 2, y1: t.y - alt / 2, y2: t.y + alt / 2 })
        rotulos.push({ ...base, linhas: dentro, tx: cx, ty: cy - ((dentro.length - 1) / 2) * FONTE * 1.2 * px })
        continue
      }
      // 2) ícone no bloco e nome embaixo, se houver espaço
      const icone = { x1: t.x - 8, x2: t.x + 8, y1: t.y - 8, y2: t.y + 8 }
      if (!livre(icone)) continue
      const fora = linhasQueCabem(l.nome, 120) || [l.nome]
      const larg = Math.max(...fora.map(largTexto))
      const texto = { x1: t.x - larg / 2 - 2, x2: t.x + larg / 2 + 2, y1: t.y + 9, y2: t.y + 11 + fora.length * FONTE * 1.2 }
      ocupado.push(icone)
      if (livre(texto)) {
        ocupado.push(texto)
        rotulos.push({ ...base, icone: iconeDe(l), cx, cy, linhas: fora, fora: true, tx: cx, ty: cy + (9 + FONTE * 0.6) * px })
      } else {
        rotulos.push({ ...base, icone: iconeDe(l), cx, cy, linhas: [] })
      }
    }
  }

  // etiqueta do destino (com X), presa em cima do lugar
  let etiqueta = null
  if (vb && destino) {
    const t = naTela({ x: destino.x + destino.w / 2, y: destino.y })
    etiqueta = { x: Math.min(Math.max(t.x, 100), tam.w - 100), y: Math.max(t.y, (margem?.topo || 0) + 40) }
  }

  return (
    <div className={`mapa${modoStreetView ? ' modo-street' : ''}`} ref={caixa}>
      {vb && (
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        >
          <defs>
            <pattern id="mata" width="44" height="40" patternUnits="userSpaceOnUse">
              <rect width="44" height="40" fill="#d3e6c6" />
              <circle cx="10" cy="11" r="9" fill="#c4dcb4" />
              <circle cx="32" cy="15" r="11" fill="#c8dfb9" />
              <circle cx="18" cy="31" r="8" fill="#c1d9b0" />
              <circle cx="40" cy="35" r="7" fill="#c6ddb6" />
            </pattern>
            <pattern id="ondas" width="36" height="18" patternUnits="userSpaceOnUse">
              <path d="M2 9q4.5-4.5 9 0t9 0" fill="none" stroke="#ffffff" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" />
            </pattern>
          </defs>

          <rect x={vb.x - vb.w} y={vb.y - vb.h} width={vb.w * 3} height={vb.h * 3} className="fundo" />
          {chao}

          {/* nomes das ruas da cidade */}
          {C.ruas.filter((r, i, todas) => r.nome && todas.findIndex((o) => o.nome === r.nome) === i).map((r, i) => {
            const m = rotuloDaRua(r.pontos)
            return (
              <text key={i} className="rotulo-rua" x={m.x} y={m.y} fontSize={11 * px} strokeWidth={3 * px}
                transform={`rotate(${m.ang} ${m.x} ${m.y})`}>{r.nome}</text>
            )
          })}

          {px > 1.6 && C.zonas.map((z) => (
            <text key={z.nome} className="rotulo-zona" x={z.x} y={z.y} fontSize={12 * px} strokeWidth={3 * px}>{z.nome}</text>
          ))}

          {editor && dados.caminhos.map(([a, b]) => (
            <line key={a + b} className="corredor" strokeWidth={1.5 * px}
              x1={dados.nos[a].x} y1={dados.nos[a].y} x2={dados.nos[b].x} y2={dados.nos[b].y} />
          ))}

          {/* lugares: formas */}
          {dados.locais.map((l) => {
            const cor = dados.categorias[l.categoria].cor
            const eDestino = destino && l.id === destino.id
            const eOrigem = origem && l.id === origem.id
            const apagado = destaque && !destaque.has(l.id)
            const agua = l.estilo === 'agua'
            const forma = (props) => l.pontos
              ? <polygon points={lista(l.pontos)} {...props} />
              : l.forma === 'circulo'
                ? <ellipse cx={l.x + l.w / 2} cy={l.y + l.h / 2} rx={l.w / 2} ry={l.h / 2} {...props} />
                : <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={Math.min(l.w, l.h, 12 * px) * 0.25} {...props} />
            return (
              <g key={l.id} data-local={l.id} className={`local${apagado ? ' apagado' : ''}`}>
                {forma({ className: agua ? 'lago' : 'local-base' })}
                {!agua && forma({ fill: cor, fillOpacity: eDestino ? 0.9 : 0.16 })}
                {agua && forma({ fill: 'url(#ondas)' })}
                {forma({
                  fill: 'none',
                  stroke: eDestino ? 'var(--destino)' : eOrigem ? 'var(--voce)' : cor,
                  strokeOpacity: eDestino || eOrigem ? 1 : 0.55,
                  strokeWidth: (eDestino || eOrigem ? 2.5 : 1) * px,
                })}
              </g>
            )
          })}

          {/* lugares: nomes e ícones, sem sobrepor */}
          {rotulos.map((r) => (
            <g key={r.id} className={`sem-toque${r.apagado ? ' apagado' : ''}`}>
              {r.icone && (
                <g transform={`translate(${r.cx - 7 * px} ${r.cy - 7 * px}) scale(${(14 * px) / 24})`}>
                  <circle cx="12" cy="12" r="12" fill={r.cor} stroke="#fff" strokeWidth="2" />
                  <path d={r.icone} transform="translate(4.8 4.8) scale(.6)" className="icone" />
                </g>
              )}
              {r.linhas.map((t, i) => (
                <text key={i} className={`rotulo${r.fora ? ' rotulo-fora' : ''}${r.ativo ? ' rotulo-ativo' : ''}`}
                  x={r.tx} y={r.ty + i * FONTE * 1.2 * px} fontSize={FONTE * px} strokeWidth={3.5 * px}>{t}</text>
              ))}
            </g>
          ))}

          {/* rota */}
          {pontos && (
            <>
              <polyline className="rota-borda" points={pontos.map((p) => `${p.x},${p.y}`).join(' ')} />
              <polyline className="rota" points={pontos.map((p) => `${p.x},${p.y}`).join(' ')} />
            </>
          )}

          {/* destino: alfinete */}
          {pontoDestino && (
            <g className="sem-toque" transform={`translate(${pontoDestino.x} ${pontoDestino.y}) scale(${px})`}>
              <path d="M0 0c-2-6-10-11-10-19a10 10 0 0 1 20 0c0 8-8 13-10 19z" fill="var(--destino)" stroke="#fff" strokeWidth="2" />
              <circle cy="-19" r="3.6" fill="#fff" />
            </g>
          )}

          {/* você está aqui */}
          {pontoOrigem && (
            <g className="sem-toque" transform={`translate(${pontoOrigem.x} ${pontoOrigem.y}) scale(${px})`}>
              <circle r="20" fill="var(--voce)" fillOpacity=".15" className="pulso" />
              <circle r="8" fill="var(--voce)" stroke="#fff" strokeWidth="3" />
            </g>
          )}

          {editor && Object.entries(dados.nos).map(([id, n]) => (
            <text key={id} className="no-id" x={n.x + 2 * px} y={n.y - 2 * px} fontSize={10 * px}>{id}</text>
          ))}
        </svg>
      )}

      {/* "Você está aqui" sempre legível */}
      {vb && pontoOrigem && !destino && (() => {
        const t = naTela(pontoOrigem)
        return <div className="voce-aqui" style={{ left: t.x, top: t.y }}>Você está aqui</div>
      })()}

      {/* etiqueta do destino, com X para desmarcar */}
      {etiqueta && (
        <div className="etiqueta" style={{ left: etiqueta.x, top: etiqueta.y }}>
          <span>{destino.nome}</span>
          <button aria-label="Desmarcar destino" onClick={aoLimpar}>×</button>
        </div>
      )}

      <div className="controles" style={{ top: (margem?.topo || 0) + 8 }}>
        <button aria-label="Aproximar" onClick={() => zoomEm(tam.w / 2, tam.h / 2, 1 / 1.6)}>+</button>
        <button aria-label="Afastar" onClick={() => zoomEm(tam.w / 2, tam.h / 2, 1.6)}>−</button>
        <button aria-label="Street View: tocar num ponto do mapa" aria-pressed={!!modoStreetView}
          className={modoStreetView ? 'ativo' : ''} onClick={aoAlternarStreetView}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="5" r="2.6" fill="currentColor" />
            <path d="M9 9.5h6l-.8 6.2h-1.4L12.5 21h-1l-.3-5.3H9.8z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <a className="credito" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
        style={{ bottom: (margem?.baixo || 0) + 4 }}>{C.atribuicao}</a>

      {editor && clique && <div className="coordenadas">x: {clique.x}, y: {clique.y}</div>}
    </div>
  )
}
