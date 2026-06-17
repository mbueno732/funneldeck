'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Estrategia } from '@/lib/types'

export async function listarEstrategias(funilId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('estrategias')
    .select('*')
    .eq('funil_id', funilId)
    .order('ordem')
    .order('criado_em')
  if (error) throw error
  return data as Estrategia[]
}

export async function listarTodasEstrategias() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('estrategias')
    .select('*')
    .order('funil_id')
    .order('ordem')
  if (error) throw error
  return data as Estrategia[]
}

export async function criarEstrategia(input: {
  funil_id: string
  nome: string
  caminho_url?: string | null
  ordem?: number
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('estrategias')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  revalidatePath('/funis')
  revalidatePath('/paginas')
  return data as Estrategia
}

export async function atualizarEstrategia(id: string, input: Partial<Pick<Estrategia, 'nome' | 'caminho_url' | 'ordem'>>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('estrategias')
    .update({ ...input, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  revalidatePath('/funis')
  revalidatePath('/paginas')
  return data as Estrategia
}

export async function deletarEstrategia(id: string) {
  const supabase = await createClient()
  await supabase.from('paginas').update({ estrategia_id: null }).eq('estrategia_id', id)
  const { error } = await supabase.from('estrategias').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/funis')
  revalidatePath('/paginas')
}
