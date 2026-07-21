import { createClient } from '@/lib/supabase/server'
import { MapaPaginas } from '@/components/paginas/MapaPaginas'
import type { Pagina, Funil, Especialista, Configuracao, Estrategia, Produto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PaginasPage({ searchParams }: { searchParams: { funil?: string; produto?: string; status?: string; atrasadas?: string; mes?: string } }) {
  const supabase = await createClient()

  const [
    { data: paginas },
    { data: funis },
    { data: especialistas },
    { data: configs },
    { data: estrategias },
    { data: produtos },
    { data: testesAtivosRaw },
  ] = await Promise.all([
    supabase.from('paginas').select('*, funis(id, id_funil, nome, tipo), produtos(id, nome), checklists_publicacao(id, checklist_itens(id, concluido, nao_se_aplica))').order('codigo').order('nome'),
    supabase.from('funis').select('id, id_funil, nome, tipo, status, produto_id, especialista_id, produtos(especialista_id)').order('nome'),
    supabase.from('especialistas').select('id, nome, ativo').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('*').eq('ativo', true).order('categoria').order('ordem'),
    supabase.from('estrategias').select('*').order('funil_id').order('ordem'),
    supabase.from('produtos').select('id, nome, especialista_id').eq('ativo', true).order('nome'),
    supabase.from('testes_ab').select('variantes_teste(pagina_id)').eq('status', 'Ativo'),
  ])

  const paginaIdsComTesteAtivo = new Set(
    (testesAtivosRaw ?? []).flatMap(t => (t.variantes_teste ?? []).map(v => v.pagina_id)).filter(Boolean)
  )
  const paginasComIndicador = (paginas ?? []).map(p => ({ ...p, tem_teste_ativo: paginaIdsComTesteAtivo.has(p.id) }))

  return (
    <MapaPaginas
      paginas={paginasComIndicador as Pagina[]}
      funis={(funis ?? []) as unknown as Funil[]}
      especialistas={(especialistas ?? []) as Especialista[]}
      configs={(configs ?? []) as Configuracao[]}
      estrategias={(estrategias ?? []) as Estrategia[]}
      produtos={(produtos ?? []) as Produto[]}
      initialFunilId={searchParams.funil}
      initialProdutoId={searchParams.produto}
      initialStatus={searchParams.status}
      initialAtrasadas={searchParams.atrasadas === '1'}
      initialMes={searchParams.mes}
    />
  )
}
