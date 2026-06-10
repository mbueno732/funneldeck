'use server'
import { createClient } from '@/lib/supabase/server'
import type { Configuracao, CategoriaConfig } from '@/lib/types'

export async function listarConfiguracoes(categoria: CategoriaConfig) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('categoria', categoria)
    .eq('ativo', true)
    .order('ordem')
  if (error) throw error
  return data as Configuracao[]
}

export async function listarTodasConfiguracoes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .order('categoria')
    .order('ordem')
  if (error) throw error
  return data as Configuracao[]
}

export async function criarConfiguracao(input: { categoria: CategoriaConfig; valor: string; cor?: string; ordem?: number }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('configuracoes')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as Configuracao
}

export async function atualizarConfiguracao(id: string, input: Partial<Pick<Configuracao, 'valor' | 'cor' | 'ordem' | 'ativo'>>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('configuracoes')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Configuracao
}

export async function deletarConfiguracao(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('configuracoes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
