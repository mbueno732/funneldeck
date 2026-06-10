'use server'
import { createClient } from '@/lib/supabase/server'

export async function buscarHistoricoStatus(pagina_id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('historico_status_pagina')
    .select('*, usuarios(nome, email)')
    .eq('pagina_id', pagina_id)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data
}
