import { confiancaZTest } from '@/lib/estatistica'
import type { TesteAB } from '@/lib/types'

export type ClassificacaoTeste = 'vencedora' | 'perdedora' | 'empate' | 'ativo' | 'planejado'

function taxaConversao(sessoes: number, conversoes: number): number {
  return sessoes > 0 ? (conversoes / sessoes) * 100 : 0
}

/**
 * Classifica o RESULTADO do teste (não da variante) em 5 estados. Testes finalizados sem
 * vencedora explícita (`is_vencedor`) são desempatados estatisticamente: se algum desafiante
 * perdeu com confiança >= 80%, o teste conta como "perdedora"; senão, "empate" — a mesma lógica
 * de confiança (z-test) já usada no Detalhe do Experimento, sem precisar de mais nenhuma coluna.
 */
export function classificarTeste(t: TesteAB): ClassificacaoTeste {
  if (t.status === 'Planejado') return 'planejado'
  if (t.status === 'Ativo') return 'ativo'

  const variantes = t.variantes_teste ?? []
  if (variantes.some(v => v.is_vencedor)) return 'vencedora'

  const controle = variantes.find(v => v.is_controle)
  if (!controle || !controle.sessoes) return 'empate'
  const crControle = taxaConversao(controle.sessoes, controle.conversoes ?? 0)

  const houvePerdaSignificativa = variantes
    .filter(v => !v.is_controle && (v.sessoes ?? 0) > 0)
    .some(v => {
      const crVariante = taxaConversao(v.sessoes!, v.conversoes ?? 0)
      if (crVariante >= crControle) return false
      const confianca = confiancaZTest(crControle, controle.sessoes!, crVariante, v.sessoes!)
      return confianca !== null && confianca >= 80
    })

  return houvePerdaSignificativa ? 'perdedora' : 'empate'
}

export function liftDoTeste(t: TesteAB): number | null {
  const variantes = t.variantes_teste ?? []
  const controle = variantes.find(v => v.is_controle)
  const vencedora = variantes.find(v => v.is_vencedor)
  if (!controle || !vencedora || controle.id === vencedora.id) return null
  const crControle = taxaConversao(controle.sessoes ?? 0, controle.conversoes ?? 0)
  if (crControle <= 0) return null
  const crVencedora = taxaConversao(vencedora.sessoes ?? 0, vencedora.conversoes ?? 0)
  return ((crVencedora - crControle) / crControle) * 100
}

export function cvrDaVencedora(t: TesteAB): number | null {
  const vencedora = (t.variantes_teste ?? []).find(v => v.is_vencedor)
  if (!vencedora || !vencedora.sessoes) return null
  return taxaConversao(vencedora.sessoes, vencedora.conversoes ?? 0)
}

export interface KpisDashboard {
  testesTotais: number
  ativos: number
  planejados: number
  vencedores: number
  perdedores: number
  empates: number
  winRate: number | null
  cvrMedioVencedor: number | null
  liftMedioVencedor: number | null
}

export function calcularKpis(testes: TesteAB[]): KpisDashboard {
  const classificados = testes.map(t => ({ t, c: classificarTeste(t) }))
  const vencedores = classificados.filter(x => x.c === 'vencedora')
  const perdedores = classificados.filter(x => x.c === 'perdedora').length
  const empates = classificados.filter(x => x.c === 'empate').length
  const concluidos = vencedores.length + perdedores + empates

  const lifts = vencedores.map(x => liftDoTeste(x.t)).filter((v): v is number => v !== null)
  const cvrs = vencedores.map(x => cvrDaVencedora(x.t)).filter((v): v is number => v !== null)

  return {
    testesTotais: testes.length,
    ativos: classificados.filter(x => x.c === 'ativo').length,
    planejados: classificados.filter(x => x.c === 'planejado').length,
    vencedores: vencedores.length,
    perdedores,
    empates,
    winRate: concluidos > 0 ? (vencedores.length / concluidos) * 100 : null,
    cvrMedioVencedor: cvrs.length > 0 ? cvrs.reduce((s, v) => s + v, 0) / cvrs.length : null,
    liftMedioVencedor: lifts.length > 0 ? lifts.reduce((s, v) => s + v, 0) / lifts.length : null,
  }
}

export interface LinhaAgrupada {
  chave: string
  total: number
  vencedores: number
  winRate: number | null
  liftMedio: number | null
  cvrMedio: number | null
}

/** Agrupa testes por um campo simples do teste (segmento, elemento_testado, ou 1 ângulo por vez). */
export function agruparPor(testes: TesteAB[], valorDe: (t: TesteAB) => string[] | string | null): LinhaAgrupada[] {
  const grupos = new Map<string, TesteAB[]>()
  for (const t of testes) {
    const valor = valorDe(t)
    const chaves = Array.isArray(valor) ? valor : valor ? [valor] : []
    for (const chave of chaves) {
      const lista = grupos.get(chave) ?? []
      lista.push(t)
      grupos.set(chave, lista)
    }
  }
  return Array.from(grupos.entries())
    .map(([chave, lista]) => {
      const kpis = calcularKpis(lista)
      const concluidos = kpis.vencedores + kpis.perdedores + kpis.empates
      return {
        chave,
        total: lista.length,
        vencedores: kpis.vencedores,
        winRate: concluidos > 0 ? kpis.winRate : null,
        liftMedio: kpis.liftMedioVencedor,
        cvrMedio: kpis.cvrMedioVencedor,
      }
    })
    .sort((a, b) => {
      if (a.winRate === null && b.winRate === null) return b.total - a.total
      if (a.winRate === null) return 1
      if (b.winRate === null) return -1
      if (a.winRate !== b.winRate) return b.winRate - a.winRate
      return b.total - a.total
    })
}
