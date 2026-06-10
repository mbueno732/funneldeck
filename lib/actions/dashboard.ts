'use server'
import { createClient } from '@/lib/supabase/server'
import type { DashboardKpis } from '@/lib/types'

export async function buscarKpis(): Promise<DashboardKpis> {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]

  const [
    { count: total_paginas },
    { count: paginas_publicadas },
    { count: paginas_em_andamento },
    { count: paginas_atrasadas },
    { count: total_funis },
    { count: funis_ativos },
    { count: testes_ativos },
  ] = await Promise.all([
    supabase.from('paginas').select('*', { count: 'exact', head: true }),
    supabase.from('paginas').select('*', { count: 'exact', head: true }).eq('status', 'Publicada'),
    supabase.from('paginas').select('*', { count: 'exact', head: true }).eq('status', 'Em andamento'),
    supabase.from('paginas').select('*', { count: 'exact', head: true })
      .lt('data_prevista', hoje)
      .not('status', 'in', '("Publicada","Suspensa")'),
    supabase.from('funis').select('*', { count: 'exact', head: true }),
    supabase.from('funis').select('*', { count: 'exact', head: true }).eq('status', 'Ativo'),
    supabase.from('testes_ab').select('*', { count: 'exact', head: true }).eq('status', 'Ativo'),
  ])

  const tp = total_paginas ?? 0
  const pp = paginas_publicadas ?? 0

  return {
    total_paginas: tp,
    paginas_publicadas: pp,
    paginas_em_andamento: paginas_em_andamento ?? 0,
    paginas_atrasadas: paginas_atrasadas ?? 0,
    total_funis: total_funis ?? 0,
    funis_ativos: funis_ativos ?? 0,
    testes_ativos: testes_ativos ?? 0,
    pct_publicadas: tp > 0 ? Math.round((pp / tp) * 100) : 0,
  }
}
