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

export async function listarAtribuicoesPaginas(funilId: string): Promise<{ id: string; estrategia_id: string | null }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('paginas')
    .select('id, estrategia_id')
    .eq('funil_id', funilId)
  return (data ?? []) as { id: string; estrategia_id: string | null }[]
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
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Estratégia não foi criada. Tente novamente.')
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

export async function deletarEstrategia(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()

    const { error: errUpdate } = await supabase
      .from('paginas')
      .update({ estrategia_id: null })
      .eq('estrategia_id', id)
    if (errUpdate) {
      return { ok: false, erro: `Erro ao desvincular páginas: ${errUpdate.message}` }
    }

    const { error, count } = await supabase
      .from('estrategias')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) return { ok: false, erro: error.message }
    if (count === 0) return { ok: false, erro: 'Estratégia não encontrada no banco. Atualize a página.' }

    revalidatePath('/funis', 'layout')
    revalidatePath('/paginas')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
