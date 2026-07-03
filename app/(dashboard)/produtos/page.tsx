export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { GerenciarProdutos } from '@/components/produtos/GerenciarProdutos'
import type { Produto, Especialista } from '@/lib/types'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const [{ data: produtos }, { data: especialistas }, { data: paginasProduto }, { data: funisProduto }] = await Promise.all([
    supabase.from('produtos').select('*, especialistas(id, nome)').order('nome'),
    supabase.from('especialistas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('paginas').select('produto_id').not('produto_id', 'is', null),
    supabase.from('funis').select('produto_id').not('produto_id', 'is', null),
  ])

  const paginasCounts = (paginasProduto ?? []).reduce((acc, p) => {
    if (p.produto_id) acc[p.produto_id] = (acc[p.produto_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const funisCounts = (funisProduto ?? []).reduce((acc, f) => {
    if (f.produto_id) acc[f.produto_id] = (acc[f.produto_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <GerenciarProdutos
      produtos={(produtos ?? []) as Produto[]}
      especialistas={(especialistas ?? []) as Especialista[]}
      paginasCounts={paginasCounts}
      funisCounts={funisCounts}
    />
  )
}
