'use server'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from './auditoria'
import type { Produto } from '@/lib/types'

export async function listarProdutos(especialista_id?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('produtos')
    .select('*, especialistas(id, nome)')
    .order('nome')
  if (especialista_id) query = query.eq('especialista_id', especialista_id)
  const { data, error } = await query
  if (error) throw error
  return data as Produto[]
}

export async function criarProduto(input: { especialista_id: string; nome: string; descricao?: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produtos')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('produtos', data.id, 'criar', { depois: data })
  return data as Produto
}

export async function atualizarProduto(id: string, input: { nome?: string; descricao?: string; ativo?: boolean }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produtos')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('produtos', id, 'atualizar', { depois: data })
  return data as Produto
}

export async function deletarProduto(id: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from('funis')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', id)
  if ((count ?? 0) > 0) throw new Error(`Este produto possui ${count} funil(is) vinculado(s). Remova-os antes de excluir.`)
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) throw error
  await registrarAuditoria('produtos', id, 'deletar', {})
}
