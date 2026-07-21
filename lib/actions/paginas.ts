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
      .not('status', 'in', '("Publicada","Suspensa","Implementada")')
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

async function gerarCodigo(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  escopo: { funil_id?: string | null; produto_id?: string | null },
  etapa: string | null | undefined
): Promise<string> {
  const prefix = escopo.produto_id ? 'PP' : (etapa ? (PREFIXOS[etapa] ?? 'PG') : 'PG')
  let query = supabase.from('paginas').select('codigo').like('codigo', `${prefix}-%`)
  if (escopo.produto_id) query = query.eq('produto_id', escopo.produto_id)
  else if (escopo.funil_id) query = query.eq('funil_id', escopo.funil_id)
  const { data } = await query
  const numeros = (data ?? [])
    .map((p: { codigo: string | null }) => parseInt(p.codigo?.split('-')[1] ?? '0'))
    .filter((n: number) => !isNaN(n))
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
  return `${prefix}-${String(proximo).padStart(2, '0')}`
}

async function resetVeiculacaoIrmas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  funilId: string | null | undefined,
  etapa: string | null | undefined,
  excetoId?: string
) {
  let query = supabase.from('paginas').update({ pagina_atual: false }).eq('funil_id', funilId ?? '')
  query = etapa ? query.eq('etapa', etapa) : query.is('etapa', null)
  if (excetoId) query = query.neq('id', excetoId)
  await query
}

export async function criarPagina(input: Omit<Pagina, 'id' | 'criado_em' | 'atualizado_em' | 'funis' | 'produtos'>) {
  const supabase = await createClient()
  const codigo = input.codigo || await gerarCodigo(supabase, { funil_id: input.funil_id, produto_id: input.produto_id }, input.etapa)

  if (input.pagina_atual && input.funil_id) {
    await resetVeiculacaoIrmas(supabase, input.funil_id, input.etapa)
  }

  const { data, error } = await supabase
    .from('paginas')
    .insert({ ...input, codigo })
    .select()
    .single()
  if (error) throw error
  await registrarAuditoria('paginas', data.id, 'criar', { depois: data })
  revalidatePath('/paginas')
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
  return data as Pagina
}

export async function atualizarPagina(id: string, input: Partial<Omit<Pagina, 'id' | 'criado_em' | 'atualizado_em' | 'funis'>>) {
  const supabase = await createClient()
  const payload = { ...input }
  if (input.status === 'Publicada' && !input.data_publicacao) {
    const { data: atual } = await supabase.from('paginas').select('data_publicacao').eq('id', id).single()
    if (!atual?.data_publicacao) payload.data_publicacao = new Date().toISOString().split('T')[0]
  }
  if (input.pagina_atual) {
    const { data: atual } = await supabase.from('paginas').select('funil_id, etapa').eq('id', id).single()
    if (atual?.funil_id) await resetVeiculacaoIrmas(supabase, atual.funil_id, atual.etapa, id)
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
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
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
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
  return data as Pagina
}

export async function criarVariante(input: {
  paginaOrigemId: string
  urlPagina: string
  slugRaiz: string
  variante: string | null
  versao: number
  oQueMudou: string[]
}): Promise<Pagina> {
  const supabase = await createClient()
  const { data: origem, error: errBusca } = await supabase
    .from('paginas').select('*').eq('id', input.paginaOrigemId).single()
  if (errBusca) throw errBusca

  const { id: _id, criado_em: _c, atualizado_em: _a, ...campos } = origem
  const codigo = await gerarCodigo(supabase, { funil_id: origem.funil_id, produto_id: origem.produto_id }, origem.etapa)

  const { data, error } = await supabase
    .from('paginas')
    .insert({
      ...campos,
      codigo,
      url_pagina: input.urlPagina || null,
      slug_raiz: input.slugRaiz || null,
      variante: input.variante || null,
      versao: input.versao,
      pagina_origem_id: input.paginaOrigemId,
      status: 'A fazer',
      horas_reais: null,
      data_publicacao: null,
      data_prevista: null,
      gtmetrix_grade: null,
      gtmetrix_score: null,
      gtmetrix_lcp: null,
      gtmetrix_tempo: null,
      gtmetrix_analisado_em: null,
    })
    .select()
    .single()
  if (error) throw error

  await registrarAuditoria('paginas', data.id, 'criar_variante', {
    origem: input.paginaOrigemId,
    o_que_mudou: input.oQueMudou,
  })
  revalidatePath('/paginas')
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
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
  revalidatePath('/funis', 'layout')
  revalidatePath('/dashboard')
}

export async function definirVeiculacao(id: string, emVeiculacao: boolean): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()

  const { data: pagina, error: errBusca } = await supabase
    .from('paginas').select('funil_id, etapa').eq('id', id).single()
  if (errBusca || !pagina) return { ok: false, erro: 'Página não encontrada.' }

  if (!emVeiculacao) {
    const { error } = await supabase.from('paginas').update({ pagina_atual: false }).eq('id', id)
    if (error) return { ok: false, erro: error.message }
  } else {
    await resetVeiculacaoIrmas(supabase, pagina.funil_id, pagina.etapa, id)
    const { error: errSet } = await supabase.from('paginas').update({ pagina_atual: true }).eq('id', id)
    if (errSet) return { ok: false, erro: errSet.message }
  }

  await registrarAuditoria('paginas', id, 'definir_veiculacao', { em_veiculacao: emVeiculacao })
  revalidatePath('/paginas')
  revalidatePath('/funis', 'layout')
  return { ok: true }
}
