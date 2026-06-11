'use server'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from './auditoria'
import { revalidatePath } from 'next/cache'
import type { Funil } from '@/lib/types'

export async function listarFunis(produto_id?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('funis')
    .select(`
      *,
      produtos(id, nome, especialistas(id, nome)),
      paginas(count)
    `)
    .order('nome')
  if (produto_id) query = query.eq('produto_id', produto_id)
  const { data, error } = await query
  if (error) throw error
  return data as Funil[]
}

export async function buscarFunil(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('funis')
    .select('*, produtos(id, nome, especialistas(id, nome))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Funil
}

export async function criarFunil(input: {
  produto_id?: string | null
  nome: string
  tipo: string
  id_funil?: string
  responsavel_cro?: string
  responsavel_dev?: string
  status?: string
  data_ativacao?: string
  planilha_leads?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('funis')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('funis', data.id, 'criar', { depois: data })
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
  return data as Funil
}

export async function atualizarFunil(id: string, input: Partial<Omit<Funil, 'id' | 'criado_em' | 'atualizado_em' | 'produtos' | 'total_paginas' | 'paginas_publicadas' | 'impl_nao_publicadas'>>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('funis')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('funis', id, 'atualizar', { depois: data })
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
  return data as Funil
}

export async function deletarFunil(id: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from('paginas')
    .select('id', { count: 'exact', head: true })
    .eq('funil_id', id)
  if ((count ?? 0) > 0) throw new Error(`Este funil possui ${count} página(s) vinculada(s). Remova-as antes de excluir.`)
  const { error } = await supabase.from('funis').delete().eq('id', id)
  if (error) throw error
  await registrarAuditoria('funis', id, 'deletar', {})
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
}

export async function duplicarFunil(
  id: string,
  opcoes: { id_funil?: string; nome: string; incluir_paginas: boolean; produto_id?: string }
) {
  const supabase = await createClient()

  const { data: original, error: errFunil } = await supabase
    .from('funis')
    .select('*')
    .eq('id', id)
    .single()
  if (errFunil) throw errFunil

  const { id: _id, criado_em: _c, atualizado_em: _a, ...campos } = original
  const { data: novoFunil, error: errNovo } = await supabase
    .from('funis')
    .insert({ ...campos, id_funil: opcoes.id_funil || null, nome: opcoes.nome, status: 'Ativo', ...(opcoes.produto_id ? { produto_id: opcoes.produto_id } : {}) })
    .select()
    .single()
  if (errNovo) throw errNovo

  if (opcoes.incluir_paginas) {
    const { data: paginas } = await supabase
      .from('paginas')
      .select('*')
      .eq('funil_id', id)

    if (paginas && paginas.length > 0) {
      const cópias = paginas.map(({ id: _id, criado_em: _c, atualizado_em: _a, ...p }: Record<string, unknown>) => ({
        ...p,
        funil_id: novoFunil.id,
        status: 'A fazer',
        horas_reais: null,
        ab_test: false,
        url_variacao_a: null,
        url_variacao_b: null,
        url_pagina: null,
      }))
      await supabase.from('paginas').insert(cópias)
    }
  }

  await registrarAuditoria('funis', novoFunil.id, 'duplicar', { origem: id, incluiu_paginas: opcoes.incluir_paginas })
  return novoFunil as Funil
}
