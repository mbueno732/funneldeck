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
  ] = await Promise.all([
    supabase.from('paginas').select('*, funis(id, id_funil, nome, tipo), produtos(id, nome), checklists_publicacao(id, checklist_itens(id, concluido, nao_se_aplica))').order('codigo').order('nome'),
    supabase.from('funis').select('id, id_funil, nome, tipo, status, produto_id, produtos(especialista_id)').order('nome'),
    supabase.from('especialistas').select('id, nome, ativo').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('*').eq('ativo', true).order('categoria').order('ordem'),
    supabase.from('estrategias').select('*').order('funil_id').order('ordem'),
    supabase.from('produtos').select('id, nome, especialista_id').eq('ativo', true).order('nome'),
  ])

  return (
    <MapaPaginas
      paginas={(paginas ?? []) as Pagina[]}
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
