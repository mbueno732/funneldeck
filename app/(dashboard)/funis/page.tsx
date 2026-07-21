import { createClient } from '@/lib/supabase/server'
import { ListaFunis } from '@/components/funis/ListaFunis'
import type { Produto, Especialista, Configuracao, Estrategia } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function FunisPage({ searchParams }: { searchParams: { especialista?: string; parados?: string; produto?: string } }) {
  const supabase = await createClient()

  const [
    { data: funisRaw },
    { data: paginasRaw },
    { data: produtos },
    { data: especialistas },
    { data: configs },
    { data: estrategias },
    { data: testesAtivosRaw },
  ] = await Promise.all([
    supabase.from('funis').select('*, produtos(id, nome, especialista_id, especialistas(id, nome))').order('nome'),
    supabase.from('paginas').select('funil_id, status, etapa, data_prevista'),
    supabase.from('produtos').select('*, especialistas(id, nome)').eq('ativo', true).order('nome'),
    supabase.from('especialistas').select('id, nome, ativo').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('*').eq('ativo', true).order('categoria').order('ordem'),
    supabase.from('estrategias').select('*').order('funil_id').order('ordem'),
    supabase.from('testes_ab').select('funil_id').eq('status', 'Ativo'),
  ])

  const funilIdsComTesteAtivo = new Set((testesAtivosRaw ?? []).map(t => t.funil_id))

  const hoje = new Date().toISOString().split('T')[0]
  const etapasOrdem = (configs ?? []).filter(c => c.categoria === 'etapa' && c.ativo).map(c => c.valor)

  function etapaHealth(pags: { status: string; data_prevista?: string | null }[]) {
    if (!pags.length) return 'vazia' as const
    const ativas = pags.filter(p => p.status !== 'Suspensa')
    if (!ativas.length) return 'vazia' as const
    if (ativas.some(p => p.data_prevista && p.data_prevista < hoje && !['Publicada', 'Implementada'].includes(p.status))) return 'atrasada' as const
    if (ativas.some(p => p.status === 'Publicada')) return 'publicada' as const
    if (ativas.some(p => p.status === 'Pausada')) return 'pausada' as const
    const naoPub = ativas.filter(p => p.status !== 'Publicada')
    if (naoPub.every(p => p.status === 'Implementada')) return 'implementada' as const
    if (naoPub.some(p => p.status === 'Em andamento')) return 'andamento' as const
    return 'fazer' as const
  }

  // Computar métricas de páginas por funil
  const funis = (funisRaw ?? []).map(f => {
    const pagsFunil = (paginasRaw ?? []).filter(p => p.funil_id === f.id)

    // Pipeline por etapa — só etapas que têm páginas, na ordem das configs
    const etapasComPaginas = etapasOrdem
      .map(etapa => ({ etapa, health: etapaHealth(pagsFunil.filter(p => p.etapa === etapa)) }))
      .filter(e => e.health !== 'vazia')

    // Páginas sem etapa definida
    const semEtapa = pagsFunil.filter(p => !p.etapa)
    if (semEtapa.length) etapasComPaginas.push({ etapa: '—', health: etapaHealth(semEtapa) })

    return {
      ...f,
      total_paginas: pagsFunil.length,
      paginas_publicadas: pagsFunil.filter(p => p.status === 'Publicada').length,
      impl_nao_publicadas: pagsFunil.filter(p => p.status === 'Implementada').length,
      etapas_pipeline: etapasComPaginas,
      tem_movimento: pagsFunil.some(p => ['Em andamento', 'Implementada', 'Publicada'].includes(p.status)),
      tem_teste_ativo: funilIdsComTesteAtivo.has(f.id),
    }
  })

  return (
    <ListaFunis
      funis={funis as never}
      produtos={(produtos ?? []) as Produto[]}
      especialistas={(especialistas ?? []) as Especialista[]}
      configs={(configs ?? []) as Configuracao[]}
      estrategias={(estrategias ?? []) as Estrategia[]}
      initialEspecialistaId={searchParams.especialista}
      initialProdutoId={searchParams.produto}
      initialParados={searchParams.parados === '1'}
    />
  )
}
