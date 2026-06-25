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
  console.log('[criarEstrategia] funil_id:', input.funil_id, '| error:', error?.message ?? null, '| id_criado:', (data as Estrategia | null)?.id ?? null)
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

export async function testarCRUDEstrategia(funilId: string): Promise<{
  insert: { ok: boolean; id?: string; erro?: string }
  select: { ok: boolean; encontrado?: boolean; erro?: string }
  delete: { ok: boolean; count?: number; erro?: string }
}> {
  const supabase = await createClient()
  const result = { insert: { ok: false }, select: { ok: false }, delete: { ok: false } } as ReturnType<typeof testarCRUDEstrategia> extends Promise<infer T> ? T : never

  // INSERT
  const { data: ins, error: insErr } = await supabase
    .from('estrategias')
    .insert({ funil_id: funilId, nome: '__crud_test__' })
    .select()
    .single()
  if (insErr || !ins) {
    result.insert = { ok: false, erro: insErr?.message ?? 'data null sem erro' }
    return result
  }
  result.insert = { ok: true, id: (ins as { id: string }).id }

  // SELECT para verificar
  const { data: sel, error: selErr } = await supabase
    .from('estrategias')
    .select('id')
    .eq('id', (ins as { id: string }).id)
    .single()
  result.select = { ok: !selErr, encontrado: !!sel, erro: selErr?.message }

  // DELETE
  const { error: delErr, count } = await supabase
    .from('estrategias')
    .delete({ count: 'exact' })
    .eq('id', (ins as { id: string }).id)
  result.delete = { ok: !delErr && (count ?? 0) > 0, count: count ?? 0, erro: delErr?.message }

  return result
}

export async function deletarEstrategia(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()

    const { error: errUpdate } = await supabase
      .from('paginas')
      .update({ estrategia_id: null })
      .eq('estrategia_id', id)
    if (errUpdate) {
      console.error('[deletarEstrategia] erro ao nullify paginas:', errUpdate)
      return { ok: false, erro: `Erro ao desvincular páginas: ${errUpdate.message}` }
    }

    const { error, count } = await supabase
      .from('estrategias')
      .delete({ count: 'exact' })
      .eq('id', id)

    console.log('[deletarEstrategia] id:', id, '| error:', error?.message ?? null, '| count:', count)

    if (error) return { ok: false, erro: error.message }
    if (count === 0) return { ok: false, erro: 'Nenhuma linha deletada — verifique se SUPABASE_SERVICE_ROLE_KEY está correto nas variáveis de ambiente da Vercel.' }

    revalidatePath('/funis', 'layout')
    revalidatePath('/paginas')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro inesperado ao excluir estratégia.'
    console.error('[deletarEstrategia] exceção:', msg)
    return { ok: false, erro: msg }
  }
}
