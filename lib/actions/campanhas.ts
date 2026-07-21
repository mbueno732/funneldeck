'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Campanha } from '@/lib/types'

export async function listarCampanhas(): Promise<Campanha[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campanhas')
    .select('*')
    .order('codigo')
  if (error) throw error
  return data as Campanha[]
}

export async function criarCampanha(input: {
  codigo: string
  data_inicio?: string
  data_fim?: string
}): Promise<{ ok: boolean; erro?: string; campanha?: Campanha }> {
  if (!input.codigo.trim()) return { ok: false, erro: 'Código da campanha é obrigatório.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campanhas')
    .insert({
      codigo: input.codigo.trim(),
      data_inicio: input.data_inicio || null,
      data_fim: input.data_fim || null,
    })
    .select()
    .single()
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/variantes')
  revalidatePath('/variantes/novo')
  return { ok: true, campanha: data as Campanha }
}
