import { createClient } from '@/lib/supabase/server'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { FiltroDashboard } from '@/components/dashboard/FiltroDashboard'
import { Suspense } from 'react'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { especialista?: string }
}) {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const espFiltro = searchParams.especialista

  const [
    { data: todasPaginas },
    { data: todosFunis },
    { data: especialistas },
    { data: statusConfigs },
    { data: paginasImpl },
  ] = await Promise.all([
    supabase.from('paginas').select('id, status, data_prevista, funil_id, atualizado_em'),
    supabase.from('funis').select('id, status, produto_id, produtos(especialista_id, especialistas(id, nome))'),
    supabase.from('especialistas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('valor, cor').eq('categoria', 'status_pagina').eq('ativo', true).order('ordem'),
    supabase.from('paginas').select('id, funil_id, checklists_publicacao(checklist_itens(concluido))').eq('status', 'Implementada'),
  ])

  const funisVisiveis = espFiltro
    ? (todosFunis ?? []).filter((f: Record<string, unknown>) => {
        const prod = f.produtos as Record<string, unknown> | null
        return prod?.especialista_id === espFiltro
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
      x.data_prevista && x.data_prevista < hoje && !['Publicada', 'Suspensa'].includes(x.status)
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
    paginas_sem_data: p.filter(x => x.status === 'Em andamento' && !x.data_prevista).length,
    funis_sem_movimento: funisVisiveis.filter((fn: Record<string, unknown>) => {
      if (fn.status !== 'Ativo') return false
      return !p.filter(pg => pg.funil_id === fn.id).some(pg =>
        ['Em andamento', 'Implementada', 'Publicada'].includes(pg.status)
      )
    }).length,
    publicadas_mes: p.filter(x =>
      x.status === 'Publicada' &&
      (x as { atualizado_em?: string }).atualizado_em &&
      new Date((x as { atualizado_em?: string }).atualizado_em!) >= inicioMes
    ).length,
  }

  const espFiltrados = espFiltro
    ? (especialistas ?? []).filter(e => e.id === espFiltro)
    : (especialistas ?? [])

  const porEspecialista = espFiltrados.map(esp => {
    const funisEsp = funisVisiveis.filter((fn: Record<string, unknown>) => {
      const prod = fn.produtos as Record<string, unknown> | null
      return prod?.especialista_id === esp.id
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
        pg.data_prevista && pg.data_prevista < hoje && !['Publicada', 'Suspensa'].includes(pg.status)
      ).length,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão operacional geral</p>
        </div>
        <Suspense>
          <FiltroDashboard especialistas={(especialistas ?? []) as { id: string; nome: string; ativo: boolean; criado_em: string; atualizado_em: string }[]} />
        </Suspense>
      </div>
      <DashboardView
        kpis={kpis}
        porEspecialista={porEspecialista}
        statusConfigs={(statusConfigs ?? []) as { valor: string; cor: string | null }[]}
      />
    </div>
  )
}
