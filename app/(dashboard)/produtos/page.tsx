import { createClient } from '@/lib/supabase/server'
import { GerenciarProdutos } from '@/components/produtos/GerenciarProdutos'
import type { Produto, Especialista } from '@/lib/types'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const [{ data: produtos }, { data: especialistas }] = await Promise.all([
    supabase.from('produtos').select('*, especialistas(id, nome)').order('nome'),
    supabase.from('especialistas').select('id, nome').eq('ativo', true).order('nome'),
  ])

  return (
    <GerenciarProdutos
      produtos={(produtos ?? []) as Produto[]}
      especialistas={(especialistas ?? []) as Especialista[]}
    />
  )
}
