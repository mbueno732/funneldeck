export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarTesteAB } from '@/lib/actions/testes-ab'
import { NovoTesteABForm } from '@/components/testes-ab/variantes/NovoTesteABForm'

export default async function EditarTesteABPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [
    teste,
    { data: funis },
    { data: configsVendas },
    { data: configsAquisicao },
    { data: paginas },
    { data: especialistas },
    { data: campanhas },
    { data: configsSegmento },
    { data: configsResponsavel },
    { data: configsAngulo },
    { data: configsElemento },
    { data: testesExistentes },
    { data: variantesEmTesteAtivo },
  ] = await Promise.all([
    buscarTesteAB(params.id),
    supabase.from('funis').select('id, id_funil, nome, objetivo, especialista_id, produtos(especialista_id)').order('nome'),
    supabase.from('configuracoes').select('valor').eq('categoria', 'metrica_teste').eq('ativo', true).order('ordem'),
    supabase.from('configuracoes').select('valor').eq('categoria', 'metrica_teste_aquisicao').eq('ativo', true).order('ordem'),
    supabase.from('paginas').select('id, funil_id, nome, codigo, etapa, url_pagina').order('nome'),
    supabase.from('especialistas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('campanhas').select('id, codigo').order('codigo'),
    supabase.from('configuracoes').select('valor').eq('categoria', 'segmento_teste').eq('ativo', true).order('ordem'),
    supabase.from('configuracoes').select('valor').eq('categoria', 'responsavel').eq('ativo', true).order('ordem'),
    supabase.from('configuracoes').select('valor').eq('categoria', 'angulo_hero').eq('ativo', true).order('ordem'),
    supabase.from('configuracoes').select('valor').eq('categoria', 'elemento_testado').eq('ativo', true).order('ordem'),
    supabase.from('testes_ab').select('funil_id, segmento'),
    supabase.from('variantes_teste').select('pagina_id, teste_id, testes_ab!inner(nome, status)').eq('testes_ab.status', 'Ativo'),
  ])

  if (!teste) notFound()

  const paginasEmTesteAtivo = (variantesEmTesteAtivo ?? [])
    .filter(v => v.pagina_id && v.teste_id !== params.id)
    .map(v => ({
      pagina_id: v.pagina_id as string,
      teste_id: v.teste_id,
      teste_nome: (v.testes_ab as unknown as { nome: string }).nome,
    }))

  return (
    <NovoTesteABForm
      funis={(funis ?? []) as never}
      metricasVendas={(configsVendas ?? []).map(c => c.valor)}
      metricasAquisicao={(configsAquisicao ?? []).map(c => c.valor)}
      paginas={paginas ?? []}
      especialistas={especialistas ?? []}
      campanhas={campanhas ?? []}
      segmentos={(configsSegmento ?? []).map(c => c.valor)}
      responsaveis={(configsResponsavel ?? []).map(c => c.valor)}
      angulos={(configsAngulo ?? []).map(c => c.valor)}
      elementosTestados={(configsElemento ?? []).map(c => c.valor)}
      testesExistentes={testesExistentes ?? []}
      paginasEmTesteAtivo={paginasEmTesteAtivo}
      testeParaEditar={teste}
    />
  )
}
