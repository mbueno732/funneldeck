import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DetalhesFunil } from '@/components/funis/DetalhesFunil'
import type { Configuracao } from '@/lib/types'

export default async function FunilDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [
    { data: funil },
    { data: paginasRaw },
    { data: configs },
  ] = await Promise.all([
    supabase
      .from('funis')
      .select('*, produtos(id, nome, especialistas(id, nome))')
      .eq('id', params.id)
      .single(),
    supabase
      .from('paginas')
      .select('*, funis(id, id_funil, nome, tipo), checklists_publicacao(checklist_itens(concluido))')
      .eq('funil_id', params.id)
      .order('criado_em'),
    supabase
      .from('configuracoes')
      .select('*')
      .eq('ativo', true)
      .order('categoria')
      .order('ordem'),
  ])

  if (!funil) notFound()

  const paginaIds = (paginasRaw ?? []).map(p => p.id)

  const { data: historico } = paginaIds.length > 0
    ? await supabase
        .from('historico_status_pagina')
        .select('id, status_anterior, status_novo, criado_em, pagina_id, paginas(id, nome, etapa)')
        .in('pagina_id', paginaIds)
        .order('criado_em', { ascending: true })
    : { data: [] }

  return (
    <DetalhesFunil
      funil={funil as never}
      paginas={(paginasRaw ?? []) as never}
      historico={(historico ?? []) as never}
      configs={(configs ?? []) as Configuracao[]}
    />
  )
}
