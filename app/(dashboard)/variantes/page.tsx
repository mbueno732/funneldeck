export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { listarTestesAB } from '@/lib/actions/testes-ab'
import { ListaVariantes } from '@/components/testes-ab/variantes/ListaVariantes'

export default async function VariantesPage({
  searchParams,
}: {
  searchParams: { status?: string; tipo?: 'aquisicao' | 'vendas' }
}) {
  const supabase = await createClient()

  const [testes, { data: funis }] = await Promise.all([
    listarTestesAB(),
    supabase.from('funis').select('id, id_funil, nome, status').order('nome'),
  ])

  return (
    <ListaVariantes
      testes={testes}
      funis={funis ?? []}
      initialStatus={searchParams.status}
      initialTipo={searchParams.tipo}
    />
  )
}
