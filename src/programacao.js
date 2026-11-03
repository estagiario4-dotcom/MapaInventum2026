import programacao from './dados/programacao.json'

// data de hoje (no celular de quem abre o mapa), no formato 2026-11-05
export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// programação do evento (src/dados/programacao.json): atividades de cada lugar, em ordem de dia e hora
// (dias que já passaram saem da lista, para não mostrar informação antiga)
export const atividadesDe = (local) => programacao.atividades
  .filter((a) => a.local === local.id && a.dia >= hojeISO())
  .sort((a, b) => (a.dia + (a.inicio || '99')).localeCompare(b.dia + (b.inicio || '99')))

// só os lugares com programação (de hoje em diante) ganham o selo e respondem ao toque
export const temProgramacao = (local) => atividadesDe(local).length > 0

export default programacao
