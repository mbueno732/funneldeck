'use server'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from './auditoria'
import { revalidatePath } from 'next/cache'
import type { Especialista } from '@/lib/types'

export async function listarEspecialistas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('especialistas')
    .select('*')
    .order('nome')
  if (error) throw error
  return data as Especialista[]
}

export async function criarEspecialista(input: { nome: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('especialistas')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('especialistas', data.id, 'criar', { depois: data })
  revalidatePath('/especialistas')
  revalidatePath('/produtos')
  revalidatePath('/funis')
  return data as Especialista
}

export async function atualizarEspecialista(id: string, input: { nome?: string; ativo?: boolean }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('especialistas')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('especialistas', id, 'atualizar', { depois: data })
  revalidatePath('/especialistas')
  revalidatePath('/produtos')
  revalidatePath('/funis')
  revalidatePath('/dashboard')
  return data as Especialista
}
