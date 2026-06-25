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
  revalidatePath('/funis', 'layout')
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
  revalidatePath('/funis', 'layout')
  revalidatePath('/paginas')
  return data as Estrategia
}

export async function deletarEstrategia(id: string) {
  const supabase = await createClient()

  const { error: errUpdate } = await supabase
    .from('paginas')
    .update({ estrategia_id: null })
    .eq('estrategia_id', id)
  if (errUpdate) {
    console.error('[deletarEstrategia] erro ao nullify paginas:', errUpdate)
    throw new Error(`Erro ao desvincular páginas: ${errUpdate.message}`)
  }

  const { error, count } = await supabase
    .from('estrategias')
    .delete({ count: 'exact' })
    .eq('id', id)

  console.log('[deletarEstrategia] id:', id, '| error:', error, '| count:', count)

  if (error) throw new Error(error.message)
  if (!count) throw new Error('Estratégia não foi excluída. Pode ser um problema de permissão no banco (RLS). Verifique se SUPABASE_SERVICE_ROLE_KEY está correto na Vercel.')

  revalidatePath('/funis', 'layout')
  revalidatePath('/paginas')
}
