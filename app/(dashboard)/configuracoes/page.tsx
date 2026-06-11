export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { GerenciarConfiguracoes } from '@/components/configuracoes/GerenciarConfiguracoes'
import type { Configuracao } from '@/lib/types'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: configs } = await supabase
    .from('configuracoes')
    .select('*')
    .order('categoria')
    .order('ordem')

  return <GerenciarConfiguracoes configs={(configs ?? []) as Configuracao[]} />
}
