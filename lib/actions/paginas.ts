'use server'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from './auditoria'
import { revalidatePath } from 'next/cache'
import type { Pagina } from '@/lib/types'

export async function listarPaginas(filtros?: {
  funil_id?: string
  status?: string
  ferramenta?: string
  prioridade?: string
  etapa?: string
  q?: string
  atrasadas?: boolean
}) {
  const supabase = await createClient()
  let query = supabase
    .from('paginas')
    .select('*, funis(id, id_funil, nome, tipo)')
    .order('nome')

  if (filtros?.funil_id)  query = query.eq('funil_id', filtros.funil_id)
  if (filtros?.status)    query = query.eq('status', filtros.status)
  if (filtros?.ferramenta) query = query.eq('ferramenta', filtros.ferramenta)
  if (filtros?.prioridade) query = query.eq('prioridade', filtros.prioridade)
  if (filtros?.etapa)     query = query.eq('etapa', filtros.etapa)
  if (filtros?.q)         query = query.ilike('nome', `%${filtros.q}%`)
  if (filtros?.atrasadas) {
    const hoje = new Date().toISOString().split('T')[0]
    query = query
      .lt('data_prevista', hoje)
      .not('status', 'in', '("Publicada","Suspensa")')
  }

  const { data, error } = await query
  if (error) throw error
  return data as Pagina[]
}

export async function buscarPagina(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('paginas')
    .select('*, funis(id, id_funil, nome, tipo)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Pagina
}

const PREFIXOS: Record<string, string> = {
  'Captura': 'CP', 'Vendas': 'VD', 'TYP': 'TYP', 'OTO': 'OTO', 'Auxiliares': 'AUX',
}

async function gerarCodigo(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, funil_id: string, etapa: string | null | undefined): Promise<string> {
  const prefix = etapa ? (PREFIXOS[etapa] ?? 'PG') : 'PG'
  const { data } = await supabase
    .from('paginas')
    .select('codigo')
    .eq('funil_id', funil_id)
    .like('codigo', `${prefix}-%`)
  const numeros = (data ?? [])
    .map((p: { codigo: string | null }) => parseInt(p.codigo?.split('-')[1] ?? '0'))
    .filter((n: number) => !isNaN(n))
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
  return `${prefix}-${String(proximo).padStart(2, '0')}`
}

export async function criarPagina(input: Omit<Pagina, 'id' | 'criado_em' | 'atualizado_em' | 'funis'>) {
  const supabase = await createClient()
  const codigo = input.codigo || await gerarCodigo(supabase, input.funil_id, input.etapa)
  const { data, error } = await supabase
    .from('paginas')
    .insert({ ...input, codigo })
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('paginas', data.id, 'criar', { depois: data })
  revalidatePath('/paginas')
  revalidatePath('/funis')
  return data as Pagina
}

export async function atualizarPagina(id: string, input: Partial<Omit<Pagina, 'id' | 'criado_em' | 'atualizado_em' | 'funis'>>) {
  const supabase = await createClient()
  const payload = { ...input }
  if (input.status === 'Publicada' && !input.data_publicacao) {
    const { data: atual } = await supabase.from('paginas').select('data_publicacao').eq('id', id).single()
    if (!atual?.data_publicacao) payload.data_publicacao = new Date().toISOString().split('T')[0]
  }
  const { data, error } = await supabase
    .from('paginas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('paginas', id, 'atualizar', { depois: data })
  revalidatePath('/paginas')
  revalidatePath('/funis')
  return data as Pagina
}

export async function duplicarPagina(id: string) {
  const supabase = await createClient()
  const { data: original, error: errBusca } = await supabase
    .from('paginas')
    .select('*')
    .eq('id', id)
    .single()
  if (errBusca) throw errBusca

  const { id: _id, criado_em: _c, atualizado_em: _a, ...campos } = original
  const { data, error } = await supabase
    .from('paginas')
    .insert({
      ...campos,
      nome: `Cópia de ${original.nome}`,
      status: 'A fazer',
      url_pagina: null,
      horas_reais: null,
      data_prevista: null,
      data_publicacao: null,
    })
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('paginas', data.id, 'duplicar', { origem: id })
  revalidatePath('/paginas')
  revalidatePath('/funis')
  return data as Pagina
}

export async function deletarPagina(id: string) {
  const supabase = await createClient()

  // Remove dependências sem CASCADE antes de deletar
  await supabase.from('migracoes').delete().eq('pagina_id', id)
  await supabase.from('testes_ab').update({ pagina_id: null }).eq('pagina_id', id)

  const { error } = await supabase.from('paginas').delete().eq('id', id)
  if (error) throw error
  await registrarAuditoria('paginas', id, 'deletar', {})
  revalidatePath('/paginas')
  revalidatePath('/funis')
}
