import { createClient } from '@/lib/supabase/server'
import { MapaPaginas } from '@/components/paginas/MapaPaginas'
import type { Pagina, Funil, Especialista, Configuracao } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PaginasPage({ searchParams }: { searchParams: { funil?: string; status?: string; atrasadas?: string } }) {
  const supabase = await createClient()

  const [
    { data: paginas },
    { data: funis },
    { data: especialistas },
    { data: configs },
  ] = await Promise.all([
    supabase.from('paginas').select('*, funis(id, id_funil, nome, tipo), checklists_publicacao(id, checklist_itens(id, concluido))').order('codigo').order('nome'),
    supabase.from('funis').select('id, id_funil, nome, tipo, status, produto_id').order('nome'),
    supabase.from('especialistas').select('id, nome, ativo').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('*').eq('ativo', true).order('categoria').order('ordem'),
  ])

  return (
    <MapaPaginas
      paginas={(paginas ?? []) as Pagina[]}
      funis={(funis ?? []) as Funil[]}
      especialistas={(especialistas ?? []) as Especialista[]}
      configs={(configs ?? []) as Configuracao[]}
      initialFunilId={searchParams.funil}
      initialStatus={searchParams.status}
      initialAtrasadas={searchParams.atrasadas === '1'}
    />
  )
}
