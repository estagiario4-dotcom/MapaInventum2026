import { useEffect, useRef, useState } from 'react'
import dados from './dados/mapa.json'
import { pontoDe } from './rota'

const IMG = dados.imagem
export const MAPA_INTEIRO = { x: 0, y: 0, w: IMG.largura, h: IMG.altura }
const numerados = dados.locais.filter((l) => l.numero)
// dentro do Pavilhão: com o mapa aproximado, o telhado fica "transparente" e mostra
// os corredores e as atrações (no mesmo estilo dos pontos de fora)
const PLANTA = dados.planta
const ZOOM_PLANTA = 0.75 // unidades do mapa por pixel: abaixo disso abre o telhado
const [PX, PY, PW, PH] = PLANTA.contorno
const internos = dados.locais.filter((l) => l.dentro && l.x != null)

// ícones das atrações (24x24, traço branco)
const ICONES = {
  pato: 'M6 14c0 3.3 2.7 5 6 5s6-1.7 6-5c0-1.8-1.2-3-2.6-3.5A4 4 0 1 0 8 9c0 .9.3 1.6.7 2.2C7.1 11.8 6 12.8 6 14zM13.5 8h.01M15.8 8.6l3.2.9-3.2.9',
  foto: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  empresa: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  palco: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  banheiro: 'M7 5.5a1.5 1.5 0 1 0 0-.01M5 9h4l-.5 6H8v5H6v-5h-.5zM17 5.5a1.5 1.5 0 1 0 0-.01M15.5 9h3l1.5 6h-2v5h-2v-5h-2zM12 4v16',
  drone: 'M9 10h6v4H9zM9 10L6.5 7.5M15 10l2.5-2.5M9 14l-2.5 2.5M15 14l2.5 2.5M3.5 6.5h6M14.5 6.5h6M3.5 17.5h6M14.5 17.5h6',
  bola: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5l3.3 2.4-1.3 3.9h-4l-1.3-3.9zM12 3v4.5M15.3 9.9l4.9-1.4M8.7 9.9L3.8 8.5M14 13.8l2.8 4.3M10 13.8l-2.8 4.3',
  foguete: 'M12 3c3 2 4.5 5 4.5 9l-2 3h-5l-2-3c0-4 1.5-7 4.5-9zM12 9.5h.01M9.5 15l-2 4 3-1M14.5 15l2 4-3-1',
  fone: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z',
  volante: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3.3 11l6.7 1M20.7 11L14 12M12 14v7',
  arvore: 'M12 3l6 8h-3l4 6H5l4-6H6zM12 17v4',
  controle: 'M7 9h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L14 15h-4l-1.6 1.8A3 3 0 0 1 3 15v-2a4 4 0 0 1 4-4zM8 11v4M6 13h4M15.5 12.5h.01M17.5 14.5h.01',
  robo: 'M6 9h12v10H6zM12 5v4M12 4.5h.01M9.5 13h.01M14.5 13h.01M9 16.5h6M4 13v3M20 13v3',
  cafe: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M11 3v3',
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
  vr: 'M3 9h18v7h-6l-1.5-2h-3L9 16H3z',
  planeta: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM3 16c1.5 2 17-3.5 18-8.5',
}

// ponto de uma atração de dentro: bolinha igual às de fora, com ícone no lugar do número
// (o ponto fica na parte de trás do espaço, para não cobrir o desenho 3D)
const posPonto = (l) => l.ponto || l
function Ponto({ l, px, cor = 'var(--numero)', pulso }) {
  const p = posPonto(l)
  return (
    <g className="sem-toque" transform={`translate(${p.x} ${p.y}) scale(${px})`}>
      {pulso && <circle r="22" fill={cor} fillOpacity=".3" className="pulso" />}
      <circle r="15" fill={cor} stroke="#fff" strokeWidth="3" className="ponto-sombra" />
      <path d={ICONES[l.icone]} transform="translate(-9 -9) scale(.75)" className="ponto-icone" />
    </g>
  )
}

const linha = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ')
const numeroDe = (l) => (l.dentro ? (l.x != null ? '★' : dados.locais.find((p) => p.id === dados.pavilhao).numero) : l.numero)
const dentroDaPlanta = (p) => p.x >= PX && p.x <= PX + PW && p.y >= PY && p.y <= PY + PH

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
  const ultimoToque = useRef(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  const [vb, setVb] = useState(null)
  // movimento suave (o mapa desliza até o lugar, em vez de pular)
  const vbAtual = useRef(null)
  vbAtual.current = vb
  const anim = useRef(0)
  function pararAnimacao() { cancelAnimationFrame(anim.current) }
  function animarPara(alvo) {
    pararAnimacao()
    const de = vbAtual.current
    if (!de || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setVb(alvo)
    const t0 = performance.now(), dur = 380
    const passo = (t) => {
      const p = Math.min((t - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVb({ x: de.x + (alvo.x - de.x) * e, y: de.y + (alvo.y - de.y) * e, w: de.w + (alvo.w - de.w) * e, h: de.h + (alvo.h - de.h) * e })
      if (p < 1) anim.current = requestAnimationFrame(passo)
    }
    anim.current = requestAnimationFrame(passo)
  }
  const [clique, setClique] = useState(null)

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setTam({ w: e.contentRect.width, h: e.contentRect.height }))
    obs.observe(caixa.current)
    return () => obs.disconnect()
  }, [])

  // o mapa ocupa a tela toda: não afasta além da imagem.
  // Pode arrastar um pouco além da borda só o suficiente para nada ficar escondido atrás do painel.
  // afastar ao máximo com o dedo: a altura toda da imagem na tela
  const maxNormal = () => Math.min(IMG.largura, IMG.altura * (tam.w / tam.h))
  function limitar(v) {
    // proteção: nunca aceita um enquadramento inválido (o mapa travaria)
    if (![v.x, v.y, v.w, v.h].every(Number.isFinite)) return vbAtual.current || { x: 0, y: 0, w: IMG.largura, h: IMG.altura }
    // (uma rota longa pode afastar mais, até a largura toda, para caber inteira no celular)
    const maxW = IMG.largura
    const cx = v.x + v.w / 2
    const cy = v.y + v.h / 2
    // zoom máximo: no máximo 5 pixels de tela por unidade (a imagem não fica borrada)
    const w = Math.min(Math.max(v.w, 120, tam.w / 5), maxW)
    const h = w * (tam.h / tam.w)
    const k = w / tam.w
    const topo = (margem?.topo || 0) * k
    const baixo = (margem?.baixo || 0) * k
    const esquerda = (margem?.esquerda || 0) * k
    const x = Math.min(Math.max(cx - w / 2, -esquerda), IMG.largura - w)
    let y = Math.min(Math.max(cy - h / 2, -topo), IMG.altura - h + baixo)
    // sobrou espaço em cima e embaixo: deixa a imagem no meio da parte livre
    if (h - topo - baixo > IMG.altura) y = IMG.altura / 2 - (topo + h - baixo) / 2
    return { x, y, w, h }
  }

  // enquadra uma caixa do mapa na parte livre da tela (acima do painel)
  // "manter": ponto que precisa aparecer quando a caixa não cabe na tela (ex.: onde a pessoa está)
  // "mover": só arrasta o mapa até a caixa, sem mudar o zoom
  // soManter: não mexe no zoom nem no centro; só arrasta o mínimo para "manter" aparecer
  function enquadrar(b, manter, mover, soManter) {
    const topo = margem?.topo || 0
    const baixo = margem?.baixo || 0
    const esquerda = margem?.esquerda || 0
    const livreH = Math.max(tam.h - topo - baixo, 120)
    const livreW = Math.max(tam.w - esquerda - 24, 120)
    // escala (unidades do mapa por pixel), sem passar do zoom máximo e do mínimo
    const maxEscala = (soManter ? maxNormal() : IMG.largura) / tam.w
    const escala = (mover || soManter) && vb ? vb.w / tam.w
      : Math.min(Math.max(Math.max(b.w / livreW, b.h / livreH) * 1.08, Math.max(120, tam.w / 5) / tam.w), maxEscala)
    let v = soManter && vb ? { ...vb } : {
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
    if (!soManter) {
      const yMax = Math.max(IMG.altura - v.h, b.y + b.h - (v.h - baixo * escala))
      v = { ...v, y: Math.min(v.y, yMax) }
    }
    v = limitar(v)
    animarPara(v)
  }

  // "fresco": o enquadramento ainda não foi mexido pela pessoa (arrastar, zoom, toque)
  const fresco = useRef(true)
  function aplicarFoco() {
    if (foco?.pavilhao) abrirPavilhao(foco.centro)
    else if (foco) enquadrar(foco.caixa, foco.manter, foco.mover, foco.soManter)
  }
  useEffect(() => {
    if (!tam.w || !foco) return
    fresco.current = true
    aplicarFoco()
  }, [foco, tam.w, tam.h]) // eslint-disable-line react-hooks/exhaustive-deps
  // o painel mudou de tamanho: só refaz se a pessoa ainda não mexeu no mapa;
  // se já mexeu, o mapa fica onde está (no máximo arrasta o lugar escolhido para fora de trás do painel)
  useEffect(() => {
    if (!tam.w || !foco || !vb) return
    if (fresco.current) aplicarFoco()
    else if (foco.manter) enquadrar(foco.caixa, foco.manter, false, true)
  }, [margem?.baixo, margem?.esquerda]) // eslint-disable-line react-hooks/exhaustive-deps

  // aproxima o Pavilhão o suficiente para "abrir o telhado" e mostrar as atrações
  // o telhado "abre" com o mapa aproximado, ou quando o Pavilhão inteiro já cabe na largura livre da tela
  function limitePlanta() {
    return ZOOM_PLANTA
  }

  // aproxima até abrir o telhado. No computador o Pavilhão cabe inteiro;
  // no celular fica no zoom de ver as atrações e dá para arrastar para os lados.
  function abrirPavilhao(centro) {
    const esqPx = margem?.esquerda || 0
    const cabe = (PW * 1.06) / (tam.w - esqPx - 16)
    const k = Math.max(Math.min(cabe, ZOOM_PLANTA * 0.92), Math.max(120, tam.w / 5) / tam.w)
    const w = tam.w * k, h = tam.h * k
    const baixo = (margem?.baixo || 0) * k
    const livreW = (tam.w - esqPx) * k
    const c = centro || { x: PX + PW / 2, y: PY + PH / 2 }
    animarPara(limitar({ x: c.x - esqPx * k - livreW / 2, y: c.y - (h - baixo) / 2, w, h }))
  }



  // centro da parte do mapa que não fica atrás do painel (os botões + e − aproximam ali)
  const centroLivre = () => {
    const esq = margem?.esquerda || 0
    return { x: esq + (tam.w - esq) / 2, y: (tam.h - (margem?.baixo || 0)) / 2 }
  }

  function zoomEm(px, py, fator) {
    setVb((v) => {
      const mx = v.x + (px / tam.w) * v.w
      const my = v.y + (py / tam.h) * v.h
      // não deixa passar do zoom máximo/mínimo; senão o mapa "pula" para outro ponto
      const minW = Math.max(120, tam.w / 5)
      const maxW = Math.max(maxNormal(), v.w)
      fator = Math.min(Math.max(fator, minW / v.w), maxW / v.w)
      if (Math.abs(fator - 1) < 1e-3) return v
      return limitar({ x: mx - (mx - v.x) * fator, y: my - (my - v.y) * fator, w: v.w * fator, h: v.h * fator })
    })
  }

  useEffect(() => {
    const el = caixa.current
    function roda(e) {
      e.preventDefault()
      fresco.current = false
      pararAnimacao()
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
    fresco.current = false
    pararAnimacao()
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
    const nome = rotulosNaTela.current.find((r) => r.id && p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2)
    if (nome) return aoTocar(nome.id)
    // com o telhado aberto, o toque dentro do Pavilhão escolhe a atração tocada
    if (vb.w / tam.w <= limitePlanta() && dentroDaPlanta(ponto)) {
      const k = vb.w / tam.w
      let alvo = null
      for (const l of internos) {
        const d = Math.hypot(posPonto(l).x - ponto.x, posPonto(l).y - ponto.y)
        if (d < 22 * k && (!alvo || d < alvo.d)) alvo = { l, d }
      }
      if (alvo) return aoTocar(alvo.l.id)
    }
    const dentroAberto = vb.w / tam.w <= limitePlanta() && dentroDaPlanta(ponto)
    // toque perto de um número escolhe esse lugar
    const raio = Math.max(26, 26 * (vb.w / tam.w))
    let perto = null
    for (const l of dentroAberto ? [] : numerados) {
      const d = Math.hypot(l.x - ponto.x, l.y - ponto.y)
      if (d < raio && (!perto || d < perto.d)) perto = { l, d }
    }
    if (perto) return aoTocar(perto.l.id)
    // dois toques rápidos fora de um lugar: aproxima ali
    const agora = Date.now()
    const ult = ultimoToque.current
    if (ult && agora - ult.t < 350 && Math.hypot(p.x - ult.x, p.y - ult.y) < 40) {
      ultimoToque.current = null
      zoomEm(p.x, p.y, 1 / 1.8)
    } else ultimoToque.current = { t: agora, x: p.x, y: p.y }
  }

  // 1 pixel da tela em unidades do mapa
  const px = vb ? vb.w / tam.w : 1
  const aberto = px <= limitePlanta()
  const naTela = (p) => ({ x: ((p.x - vb.x) / vb.w) * tam.w, y: ((p.y - vb.y) / vb.h) * tam.h })

  const pOrigem = origem ? pontoDe(dados, origem) : null
  // onde fica a bolinha de quem está dentro do Pavilhão (a etiqueta "Você está aqui" fica presa nela)
  const cOrigem = origem ? origem.ponto || pOrigem : null
  const pDestino = destino ? pontoDe(dados, destino) : null
  const pontos = rota?.pontos

  // etiqueta do destino (com X), presa em cima do número
  const naVista = (t) => t.x > -10 && t.x < tam.w + 10 && t.y > -10 && t.y < tam.h - (margem?.baixo || 0) + 10
  let etiqueta = null
  if (vb && pDestino && naVista(naTela(destino.ponto || pDestino))) {
    const t = naTela(destino.ponto || pDestino)
    etiqueta = { x: Math.min(Math.max(t.x, 110), tam.w - 110), y: Math.max(t.y, (margem?.topo || 0) + 60) }
  }

  // nomes curtos ao lado de cada número, sem cobrir outros números nem outros nomes
  const rotulos = []
  if (vb) {
    const R0 = 16 / px + 2 // raio do número da imagem, em pixels da tela
    const ocupado = numerados.filter((l) => !(aberto && dentroDaPlanta(l))).map((l) => {
      const t = naTela(l)
      return { x1: t.x - R0, x2: t.x + R0, y1: t.y - R0, y2: t.y + R0 }
    })
    if (cOrigem && naVista(naTela(cOrigem))) {
      const t = naTela(cOrigem)
      const x = Math.min(Math.max(t.x, 80), tam.w - 80)
      ocupado.push({ x1: x - 75, x2: x + 75, y1: t.y + 28, y2: t.y + 64 })
    }
    if (etiqueta) {
      const larg = Math.min(destino.nome.length * 8 + 56, 230)
      ocupado.push({ x1: etiqueta.x - larg / 2, x2: etiqueta.x + larg / 2, y1: etiqueta.y - 72, y2: etiqueta.y - 26 })
    }
    const livre = (r) => r.x1 >= 4 && r.x2 <= tam.w - 4 && r.y1 >= 4 && r.y2 <= tam.h - (margem?.baixo || 0) - 4
      && !ocupado.some((o) => r.x1 < o.x2 && r.x2 > o.x1 && r.y1 < o.y2 && r.y2 > o.y1)
    if (aberto) {
      // nomes das atrações ao lado do ponto (mesmo estilo dos de fora)
      for (const l of internos) {
        const t = naTela(posPonto(l))
        ocupado.push({ x1: t.x - 16, x2: t.x + 16, y1: t.y - 16, y2: t.y + 16 })
      }
      // as duas entradas ficam nas laterais do Pavilhão
      const el = naTela(PLANTA.entradaLateral)
      const er = naTela(PLANTA.entradaDireita)
      for (const r of [
        { x1: el.x - 66, x2: el.x - 6, y1: el.y - 10, y2: el.y + 10 },
        { x1: er.x + 6, x2: er.x + 66, y1: er.y - 10, y2: er.y + 10 },
      ]) {
        const entrada = { ...r, id: null, texto: 'Entrada', classe: ' rotulo-entrada' }
        ocupado.push(entrada)
        rotulos.push(entrada)
      }
      const ordemDentro = [...internos].sort((a, b) => (b.id === destino?.id || b.id === origem?.id) - (a.id === destino?.id || a.id === origem?.id))
      for (const l of ordemDentro) {
        if (l.id === destino?.id) continue // o destino já tem a etiqueta com o nome
        const t = naTela(posPonto(l))
        const w = l.rotulo.length * 6.4 + 14
        const h = 20
        const r = [
          { x1: t.x + 18, y1: t.y - h / 2 },
          { x1: t.x - w / 2, y1: t.y + 17 },
          { x1: t.x - 18 - w, y1: t.y - h / 2 },
          { x1: t.x - w / 2, y1: t.y - 17 - h },
        ].map((o) => ({ ...o, x2: o.x1 + w, y2: o.y1 + h })).find(livre)
        if (!r) continue
        ocupado.push(r)
        rotulos.push({ ...r, id: l.id, texto: l.rotulo, classe: l.id === origem?.id ? ' rotulo-origem' : '' })
      }
      // os nomes de fora não entram em cima do Pavilhão aberto
      const a = naTela({ x: PX, y: PY })
      const b = naTela({ x: PX + PW, y: PY + PH })
      ocupado.push({ x1: a.x, x2: b.x, y1: a.y, y2: b.y + 24 })
    }
    const ordem = numerados.filter((l) => !(aberto && dentroDaPlanta(l)))
      .sort((a, b) => (origem?.id === b.id) - (origem?.id === a.id) || a.numero - b.numero)
    for (const l of ordem) {
      if (destino && l.id === destino.id) continue // o destino já tem a etiqueta com o nome
      const t = naTela(l)
      if (t.x < -100 || t.x > tam.w + 100 || t.y < -40 || t.y > tam.h + 40) continue
      const w = l.rotulo.length * 6.4 + 14
      const h = 20
      const R = R0
      const opcoes = [
        { x1: t.x + R + 2, y1: t.y - h / 2 }, // à direita
        { x1: t.x - w / 2, y1: t.y + R + 1 }, // embaixo
        { x1: t.x - R - 2 - w, y1: t.y - h / 2 }, // à esquerda
        { x1: t.x - w / 2, y1: t.y - R - 1 - h }, // em cima
      ].map((o) => ({ ...o, x2: o.x1 + w, y2: o.y1 + h }))
      const r = opcoes.find(livre)
      if (!r) continue
      ocupado.push(r)
      rotulos.push({ ...r, id: l.id, texto: l.rotulo, classe: l.id === dados.pavilhao ? ' rotulo-pav' : '' })
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

          {/* telhado aberto: o Pavilhão por dentro, em 3D (aparece ao aproximar) */}
          <image href={PLANTA.imagem} x={PX} y={PY} width={PW} height={PH} preserveAspectRatio="none"
            className={`pavilhao-dentro${aberto || rota?.pelaPavilhao ? ' visivel' : ''}`} />

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

          {/* atrações de dentro do Pavilhão */}
          {aberto && internos.filter((l) => l.id !== destino?.id && l.id !== origem?.id).map((l) => <Ponto key={l.id} l={l} px={px} />)}

          {/* destino: número em vermelho, por cima da linha */}
          {pDestino && (destino.icone
            ? <Ponto l={destino} px={px} cor="var(--destino)" />
            : <Marcador p={pDestino} px={px} cor="var(--destino)" texto={numeroDe(destino)} />)}

          {/* você está aqui: número em azul, pulsando */}
          {pOrigem && (origem.icone
            ? <Ponto l={origem} px={px} cor="var(--voce)" pulso />
            : <Marcador p={pOrigem} px={px} cor="var(--voce)" texto={numeroDe(origem)} pulso />)}

          {editor && Object.entries(dados.nos).map(([id, n]) => (
            <g key={id}>
              <circle cx={n.x} cy={n.y} r={3 * px} fill="#ffeb3b" />
              <text className="no-id" x={n.x + 4 * px} y={n.y - 4 * px} fontSize={11 * px}>{id}</text>
            </g>
          ))}
        </svg>
      )}

      {/* nomes dos números */}
      {rotulos.map((r, i) => (
        <div key={i} className={`rotulo${r.classe || ''}`} style={{ left: r.x1, top: r.y1 }}>{r.texto}</div>
      ))}

      {/* "Você está aqui" sempre legível */}
      {vb && cOrigem && naVista(naTela(cOrigem)) && (() => {
        const t = naTela(cOrigem)
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

      {/* dica: aproximar o Pavilhão para ver as atrações de dentro */}
      {vb && !aberto && !rota && (() => {
        // fica no meio da parte do telhado que aparece na tela
        const a = naTela({ x: PX, y: PY })
        const b = naTela({ x: PX + PW, y: PY + PH })
        const x1 = Math.max(a.x, (margem?.esquerda || 0) + 8), x2 = Math.min(b.x, tam.w - 8)
        const y1 = Math.max(a.y, 8), y2 = Math.min(b.y, tam.h - (margem?.baixo || 0) - 8)
        if (x2 - x1 < 90 || y2 - y1 < 36) return null
        const t = { x: (x1 + x2) / 2, y: y1 + (y2 - y1) * 0.6 }
        return (
          <button className="ver-dentro" style={{ left: t.x, top: t.y }}
            onClick={() => abrirPavilhao()}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M15 15l5 5M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            Ver atrações por dentro
          </button>
        )
      })()}

      <div className="controles" style={{ bottom: (margem?.baixo || 0) + 12 }}>
        <button aria-label="Aproximar" onClick={() => zoomEm(centroLivre().x, centroLivre().y, 1 / 1.6)}>+</button>
        <button aria-label="Afastar" onClick={() => zoomEm(centroLivre().x, centroLivre().y, 1.6)}>−</button>
      </div>

      {editor && clique && <div className="coordenadas">x: {clique.x}, y: {clique.y}</div>}
    </div>
  )
}
