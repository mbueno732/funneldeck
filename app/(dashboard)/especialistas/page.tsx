export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { GerenciarEspecialistas } from '@/components/especialistas/GerenciarEspecialistas'
import type { Especialista } from '@/lib/types'

export default async function EspecialistasPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('especialistas')
    .select('*')
    .order('nome')

  return <GerenciarEspecialistas especialistas={(data ?? []) as Especialista[]} />
}
