export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { DashboardV2View } from '@/components/testes-ab/DashboardV2View'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { especialista?: string; mes?: string }
}) {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]
  const espFiltro = searchParams.especialista

  const mesSelecionado = searchParams.mes ?? ''
  const mesRef = mesSelecionado ? new Date(mesSelecionado + '-02') : null
  const inicioMes = mesRef ? new Date(mesRef.getFullYear(), mesRef.getMonth(), 1) : null
  const fimMes = mesRef ? new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1) : null
  const hoje2 = new Date()
  const inicioMesAtual = new Date(hoje2.getFullYear(), hoje2.getMonth(), 1)
  const fimMesAtual = new Date(hoje2.getFullYear(), hoje2.getMonth() + 1, 1)

  const mesLabel = mesRef
    ? new Date(mesRef.getFullYear(), mesRef.getMonth(), 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : inicioMesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const [
    { data: todasPaginas },
    { data: todosFunis },
    { data: especialistas },
    { data: statusConfigs },
    { data: paginasImpl },
    { count: totalVariantes },
    { data: variantesFunis },
  ] = await Promise.all([
    supabase.from('paginas').select('id, nome, status, data_prevista, data_publicacao, funil_id, atualizado_em, horas_estimadas, horas_reais'),
    supabase.from('funis').select('id, status, produto_id, especialista_id, produtos(especialista_id, especialistas(id, nome))'),
    supabase.from('especialistas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('valor, cor').eq('categoria', 'status_pagina').eq('ativo', true).order('ordem'),
    supabase.from('paginas').select('id, funil_id, checklists_publicacao(checklist_itens(concluido))').eq('status', 'Implementada'),
    supabase.from('variantes_teste').select('id', { count: 'exact', head: true }),
    supabase.from('variantes_teste').select('teste_id, testes_ab(funil_id)'),
  ])

  const funisVisiveis = espFiltro
    ? (todosFunis ?? []).filter((f: Record<string, unknown>) => {
        const prod = f.produtos as Record<string, unknown> | null
        const espId = (f.especialista_id as string | null) ?? (prod?.especialista_id as string | undefined)
        return espId === espFiltro
      })
    : (todosFunis ?? [])

  const funilIds = funisVisiveis.map((f: Record<string, unknown>) => f.id as string)
  const p = (todasPaginas ?? []).filter(pg => funilIds.includes(pg.funil_id))

  const kpis = {
    total_paginas: p.length,
    paginas_publicadas: p.filter(x => x.status === 'Publicada').length,
    paginas_em_andamento: p.filter(x => x.status === 'Em andamento').length,
    paginas_implementadas: p.filter(x => x.status === 'Implementada').length,
    paginas_atrasadas: p.filter(x =>
      x.data_prevista && x.data_prevista < hoje && !['Publicada', 'Suspensa', 'Implementada'].includes(x.status)
    ).length,
    paginas_a_fazer: p.filter(x => x.status === 'A fazer').length,
    total_funis: funisVisiveis.length,
    funis_ativos: funisVisiveis.filter((x: Record<string, unknown>) => x.status === 'Ativo').length,
    pct_publicadas: p.length > 0
      ? Math.round((p.filter(x => x.status === 'Publicada').length / p.length) * 100)
      : 0,
    checklists_bloqueando: (paginasImpl ?? []).filter(pg => {
      if (!funilIds.includes(pg.funil_id)) return false
      const cl = (pg.checklists_publicacao as { checklist_itens: { concluido: boolean }[] }[] | null)?.[0]
      const itens = cl?.checklist_itens ?? []
      return itens.length > 0 && itens.some(i => !i.concluido)
    }).length,
    paginas_paradas: (() => {
      const limite = new Date()
      limite.setDate(limite.getDate() - 7)
      return p.filter(x => {
        if (x.status !== 'Em andamento') return false
        const at = (x as { atualizado_em?: string }).atualizado_em
        return at ? new Date(at) < limite : false
      }).length
    })(),
    taxa_entrega_mes: (() => {
      if (!inicioMes || !fimMes) return null
      const previstas = p.filter(x => x.data_prevista && x.data_prevista >= inicioMes.toISOString().split('T')[0] && x.data_prevista < fimMes.toISOString().split('T')[0])
      if (previstas.length === 0) return null
      const publicadas = previstas.filter(x => x.status === 'Publicada').length
      return Math.round((publicadas / previstas.length) * 100)
    })(),
    funis_sem_movimento: funisVisiveis.filter((fn: Record<string, unknown>) => {
      if (fn.status !== 'Ativo') return false
      return !p.filter(pg => pg.funil_id === fn.id).some(pg =>
        ['Em andamento', 'Implementada', 'Publicada'].includes(pg.status)
      )
    }).length,
    publicadas_mes: p.filter(x => {
      if (x.status !== 'Publicada') return false
      const dataPub = (x as { data_publicacao?: string }).data_publicacao
      if (!dataPub) return false
      const inicio = (inicioMes ?? inicioMesAtual).toISOString().split('T')[0]
      const fim = (fimMes ?? fimMesAtual).toISOString().split('T')[0]
      return dataPub >= inicio && dataPub < fim
    }).length,
  }

  const paginasComHoras = p.filter(x => {
    if (x.horas_estimadas == null) return false
    if (!inicioMes || !fimMes) return true
    const dataPub = (x as { data_publicacao?: string }).data_publicacao
    return dataPub && dataPub >= inicioMes.toISOString().split('T')[0] && dataPub < fimMes.toISOString().split('T')[0]
  })
  const horasEstimadas = Math.round(paginasComHoras.reduce((s, x) => s + (x.horas_estimadas ?? 0), 0) * 10) / 10
  const horasReais = Math.round(paginasComHoras.filter(x => x.horas_reais != null).reduce((s, x) => s + (x.horas_reais ?? 0), 0) * 10) / 10
  const horasDesvio = horasEstimadas > 0 ? Math.round(((horasReais - horasEstimadas) / horasEstimadas) * 100) : 0
  const topDesvios = paginasComHoras
    .filter(x => x.horas_estimadas != null && x.horas_reais != null)
    .map(x => ({
      nome: (x as { nome?: string }).nome ?? '—',
      estimadas: x.horas_estimadas!,
      reais: x.horas_reais!,
      desvio: x.horas_estimadas! > 0
        ? Math.round(((x.horas_reais! - x.horas_estimadas!) / x.horas_estimadas!) * 100)
        : 0,
    }))
    .filter(x => Math.abs(x.desvio) > 0)
    .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
    .slice(0, 5)

  const horasKpis = { estimadas: horasEstimadas, reais: horasReais, desvio_pct: horasDesvio, top_desvios: topDesvios }

  const espFiltrados = espFiltro
    ? (especialistas ?? []).filter(e => e.id === espFiltro)
    : (especialistas ?? [])

  const porEspecialista = espFiltrados.map(esp => {
    const funisEsp = funisVisiveis.filter((fn: Record<string, unknown>) => {
      const prod = fn.produtos as Record<string, unknown> | null
      const espId = (fn.especialista_id as string | null) ?? (prod?.especialista_id as string | undefined)
      return espId === esp.id
    })
    const ids = funisEsp.map((fn: Record<string, unknown>) => fn.id as string)
    const paginasEsp = (todasPaginas ?? []).filter(pg => ids.includes(pg.funil_id))
    return {
      id: esp.id,
      nome: esp.nome,
      total_funis: funisEsp.length,
      funis_ativos: funisEsp.filter((fn: Record<string, unknown>) => fn.status === 'Ativo').length,
      total_paginas: paginasEsp.length,
      paginas_publicadas: paginasEsp.filter(pg => pg.status === 'Publicada').length,
      paginas_atrasadas: paginasEsp.filter(pg =>
        pg.data_prevista && pg.data_prevista < hoje && !['Publicada', 'Suspensa', 'Implementada'].includes(pg.status)
      ).length,
      horas_estimadas: Math.round(paginasEsp.reduce((s, pg) => s + (pg.horas_estimadas ?? 0), 0) * 10) / 10,
      horas_reais: Math.round(paginasEsp.filter(pg => pg.horas_reais != null).reduce((s, pg) => s + (pg.horas_reais ?? 0), 0) * 10) / 10,
    }
  })

  const funisComVariantes = new Set(
    (variantesFunis ?? [])
      .map(v => (v.testes_ab as { funil_id?: string } | null)?.funil_id)
      .filter(Boolean)
  ).size

  const mesesDisponiveis = Array.from(new Set(
    (todasPaginas ?? [])
      .map(x => (x as { data_publicacao?: string }).data_publicacao)
      .filter((d): d is string => !!d)
      .map(d => d.slice(0, 7))
  )).sort().reverse()

  return (
    <DashboardV2View
      kpis={kpis}
      porEspecialista={porEspecialista}
      statusConfigs={(statusConfigs ?? []) as { valor: string; cor: string | null }[]}
      mesLabel={mesLabel}
      mesAtual={mesSelecionado}
      horasKpis={horasKpis}
      variantesAtivas={totalVariantes ?? 0}
      funisComVariantes={funisComVariantes}
      mesesDisponiveis={mesesDisponiveis}
      especialistas={(especialistas ?? []) as { id: string; nome: string; ativo: boolean; criado_em: string; atualizado_em: string }[]}
    />
  )
}
