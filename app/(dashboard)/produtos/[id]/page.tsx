export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DetalhesProduto } from '@/components/produtos/DetalhesProduto'
import type { Pagina, Funil, Configuracao, Estrategia, Produto, Especialista } from '@/lib/types'

export default async function ProdutoDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [
    { data: produto },
    { data: paginas },
    { data: funis },
    { data: configs },
    { data: estrategias },
    { data: todosProdutos },
    { data: especialistas },
  ] = await Promise.all([
    supabase.from('produtos').select('*, especialistas(id, nome)').eq('id', params.id).single(),
    supabase.from('paginas').select('*').eq('produto_id', params.id).order('nome'),
    supabase.from('funis').select('*').eq('produto_id', params.id).order('criado_em', { ascending: false }),
    supabase.from('configuracoes').select('*').eq('ativo', true).order('categoria').order('ordem'),
    supabase.from('estrategias').select('*').order('funil_id').order('ordem'),
    supabase.from('produtos').select('id, nome, especialista_id').eq('ativo', true).order('nome'),
    supabase.from('especialistas').select('id, nome').eq('ativo', true).order('nome'),
  ])

  if (!produto) notFound()

  return (
    <DetalhesProduto
      produto={produto as never}
      paginas={(paginas ?? []) as Pagina[]}
      funis={(funis ?? []) as Funil[]}
      configs={(configs ?? []) as Configuracao[]}
      estrategias={(estrategias ?? []) as Estrategia[]}
      todosProdutos={(todosProdutos ?? []) as Produto[]}
      especialistas={(especialistas ?? []) as Especialista[]}
    />
  )
}
