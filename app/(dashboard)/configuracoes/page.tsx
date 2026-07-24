export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { GerenciarConfiguracoes } from '@/components/configuracoes/GerenciarConfiguracoes'
import type { Configuracao, Especialista, Campanha } from '@/lib/types'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const [{ data: configs }, { data: especialistas }, { data: campanhas }] = await Promise.all([
    supabase.from('configuracoes').select('*').order('categoria').order('ordem'),
    supabase.from('especialistas').select('*').order('nome'),
    supabase.from('campanhas').select('*').order('codigo'),
  ])

  return (
    <GerenciarConfiguracoes
      configs={(configs ?? []) as Configuracao[]}
      especialistas={(especialistas ?? []) as Especialista[]}
      campanhas={(campanhas ?? []) as Campanha[]}
    />
  )
}
