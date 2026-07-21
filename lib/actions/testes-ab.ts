'use server'
import { createClient } from '@/lib/supabase/server'
import { registrarAuditoria } from './auditoria'
import { revalidatePath } from 'next/cache'
import type { TesteAB } from '@/lib/types'

const BUCKET = 'teste-ab-screenshots'

export async function listarTestesAB(): Promise<TesteAB[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('testes_ab')
    .select('*, funis(id, id_funil, nome), paginas(id, nome, codigo, etapa), campanhas(id, codigo), especialistas(id, nome), variantes_teste(id, nome, is_controle, is_vencedor, sessoes, conversoes, receita, sessoes_checkout)')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data as TesteAB[]
}

export async function buscarTesteAB(id: string): Promise<TesteAB | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('testes_ab')
    .select('*, funis(id, id_funil, nome), paginas(id, nome, codigo, etapa, url_pagina), campanhas(id, codigo), especialistas(id, nome), variantes_teste(*, paginas(id, nome, codigo))')
    .eq('id', id)
    .order('nome', { foreignTable: 'variantes_teste', ascending: true })
    .single()
  if (error) return null
  return data as TesteAB
}

export async function criarTesteAB(input: {
  funil_id: string
  tipo_teste?: 'aquisicao' | 'vendas'
  nome: string
  hipotese?: string
  hipotese_motivo?: string
  resultado_esperado?: string
  elemento_testado?: string
  angulos?: string[]
  campanha_id?: string
  nova_campanha_codigo?: string
  segmento?: string
  especialista_id?: string
  responsavel?: string
  data_inicio?: string
  metrica_primaria?: string
  nivel_confianca?: number
  poder_estatistico?: number
  status: 'Planejado' | 'Ativo'
  variantes: {
    nome: string
    pagina_id: string
    url_variante?: string
    url_preview?: string
    headline?: string
    subheadline?: string
    layout?: string
    screenshot_url?: string
    percentual_trafego: number
    is_controle: boolean
  }[]
}): Promise<{ ok: boolean; erro?: string; id?: string }> {
  if (!input.funil_id || !input.nome.trim()) {
    return { ok: false, erro: 'Nome e funil são obrigatórios.' }
  }
  if (input.variantes.length < 2) {
    return { ok: false, erro: 'É preciso pelo menos 2 variantes (controle + 1 desafiante).' }
  }
  if (input.variantes.some(v => !v.pagina_id)) {
    return { ok: false, erro: 'Toda variante precisa estar vinculada a uma página cadastrada no Mapa de Páginas.' }
  }

  const supabase = await createClient()
  try {
    let campanhaId = input.campanha_id || null
    let campanhaCodigo = ''
    if (!campanhaId && input.nova_campanha_codigo?.trim()) {
      const { data: novaCampanha, error: errCampanha } = await supabase
        .from('campanhas')
        .insert({ codigo: input.nova_campanha_codigo.trim() })
        .select()
        .single()
      if (errCampanha) return { ok: false, erro: errCampanha.message }
      campanhaId = novaCampanha.id
      campanhaCodigo = novaCampanha.codigo
    } else if (campanhaId) {
      const { data: campanha } = await supabase.from('campanhas').select('codigo').eq('id', campanhaId).single()
      campanhaCodigo = campanha?.codigo ?? ''
    }

    // Sequencial escopado por Funil + Segmento (não global) — "001" = 1º teste desse público nesse funil.
    let queryCount = supabase.from('testes_ab').select('id', { count: 'exact', head: true }).eq('funil_id', input.funil_id)
    queryCount = input.segmento ? queryCount.eq('segmento', input.segmento) : queryCount.is('segmento', null)
    const { count } = await queryCount
    const sequencial = String((count ?? 0) + 1).padStart(3, '0')
    const codigo = [sequencial, input.segmento, campanhaCodigo].filter(Boolean).join('_')

    const { data: teste, error: errTeste } = await supabase
      .from('testes_ab')
      .insert({
        funil_id: input.funil_id,
        tipo_teste: input.tipo_teste || null,
        nome: input.nome.trim(),
        hipotese: input.hipotese || null,
        hipotese_motivo: input.hipotese_motivo || null,
        resultado_esperado: input.resultado_esperado || null,
        elemento_testado: input.elemento_testado || null,
        angulos: input.angulos?.length ? input.angulos : null,
        campanha_id: campanhaId,
        segmento: input.segmento || null,
        especialista_id: input.especialista_id || null,
        responsavel: input.responsavel || null,
        codigo,
        metrica_primaria: input.metrica_primaria || null,
        nivel_confianca: input.nivel_confianca ?? 95,
        poder_estatistico: input.poder_estatistico ?? 80,
        status: input.status,
        data_inicio: input.data_inicio || (input.status === 'Ativo' ? new Date().toISOString().split('T')[0] : null),
      })
      .select()
      .single()
    if (errTeste) return { ok: false, erro: errTeste.message }

    const { error: errVariantes } = await supabase
      .from('variantes_teste')
      .insert(input.variantes.map(v => ({
        teste_id: teste.id,
        nome: v.nome,
        pagina_id: v.pagina_id,
        url_variante: v.url_variante || null,
        url_preview: v.url_preview || null,
        headline: v.headline || null,
        subheadline: v.subheadline || null,
        layout: v.layout || null,
        screenshot_url: v.screenshot_url || null,
        percentual_trafego: v.percentual_trafego,
        is_controle: v.is_controle,
      })))
    if (errVariantes) return { ok: false, erro: errVariantes.message }

    await registrarAuditoria('testes_ab', teste.id, 'criar', { depois: teste })
    revalidatePath('/variantes')
    return { ok: true, id: teste.id }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao criar teste A/B.' }
  }
}

export async function uploadScreenshotVariante(
  formData: FormData
): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { ok: false, erro: 'Nenhum arquivo enviado.' }
  if (!file.type.startsWith('image/')) return { ok: false, erro: 'Envie uma imagem (PNG, JPG...).' }
  if (file.size > 5 * 1024 * 1024) return { ok: false, erro: 'Imagem maior que 5MB.' }

  const supabase = await createClient()
  const extensao = file.name.split('.').pop() || 'png'
  const nomeArquivo = `${crypto.randomUUID()}.${extensao}`

  const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { ok: false, erro: error.message }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo)
  return { ok: true, url: data.publicUrl }
}

export async function atualizarMetricasVariante(input: {
  id: string
  teste_id: string
  sessoes: number
  conversoes: number
  receita: number
  sessoes_checkout: number
}): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('variantes_teste')
    .update({
      sessoes: input.sessoes,
      conversoes: input.conversoes,
      receita: input.receita,
      sessoes_checkout: input.sessoes_checkout,
    })
    .eq('id', input.id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/variantes/${input.teste_id}`)
  revalidatePath('/variantes')
  return { ok: true }
}

export async function atualizarHipotese(
  testeId: string,
  input: { hipotese?: string; hipotese_motivo?: string; resultado_esperado?: string }
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('testes_ab')
    .update({
      hipotese: input.hipotese?.trim() || null,
      hipotese_motivo: input.hipotese_motivo?.trim() || null,
      resultado_esperado: input.resultado_esperado?.trim() || null,
    })
    .eq('id', testeId)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/variantes/${testeId}`)
  return { ok: true }
}

export async function atualizarAprendizado(
  testeId: string,
  resultado: string
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('testes_ab')
    .update({ resultado: resultado.trim() || null })
    .eq('id', testeId)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/variantes/${testeId}`)
  return { ok: true }
}

export async function declararVencedora(
  testeId: string,
  varianteId: string
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()

  const { error: errReset } = await supabase
    .from('variantes_teste')
    .update({ is_vencedor: false })
    .eq('teste_id', testeId)
  if (errReset) return { ok: false, erro: errReset.message }

  const { error: errSet } = await supabase
    .from('variantes_teste')
    .update({ is_vencedor: true })
    .eq('id', varianteId)
  if (errSet) return { ok: false, erro: errSet.message }

  const { error: errTeste } = await supabase
    .from('testes_ab')
    .update({ status: 'Finalizado', data_fim: new Date().toISOString().split('T')[0] })
    .eq('id', testeId)
  if (errTeste) return { ok: false, erro: errTeste.message }

  await registrarAuditoria('testes_ab', testeId, 'declarar_vencedora', { variante_id: varianteId })
  revalidatePath(`/variantes/${testeId}`)
  revalidatePath('/variantes')
  return { ok: true }
}

export async function desfazerVencedora(testeId: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()

  const { error: errReset } = await supabase
    .from('variantes_teste')
    .update({ is_vencedor: false })
    .eq('teste_id', testeId)
  if (errReset) return { ok: false, erro: errReset.message }

  const { error: errTeste } = await supabase
    .from('testes_ab')
    .update({ status: 'Ativo', data_fim: null })
    .eq('id', testeId)
  if (errTeste) return { ok: false, erro: errTeste.message }

  await registrarAuditoria('testes_ab', testeId, 'desfazer_vencedora')
  revalidatePath(`/variantes/${testeId}`)
  revalidatePath('/variantes')
  return { ok: true }
}

export async function deletarTesteAB(testeId: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()

  const { error: errVariantes } = await supabase.from('variantes_teste').delete().eq('teste_id', testeId)
  if (errVariantes) return { ok: false, erro: errVariantes.message }

  const { error: errTeste } = await supabase.from('testes_ab').delete().eq('id', testeId)
  if (errTeste) return { ok: false, erro: errTeste.message }

  await registrarAuditoria('testes_ab', testeId, 'deletar')
  revalidatePath('/variantes')
  return { ok: true }
}

export async function aplicarVencedor(testeId: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('testes_ab')
    .update({ status: 'Vencedor implementado' })
    .eq('id', testeId)
  if (error) return { ok: false, erro: error.message }

  await registrarAuditoria('testes_ab', testeId, 'aplicar_vencedor')
  revalidatePath(`/variantes/${testeId}`)
  revalidatePath('/variantes')
  return { ok: true }
}
