'use server'
import { createClient } from '@/lib/supabase/server'

const GTMETRIX_API = 'https://gtmetrix.com/api/2.0'

function authHeader() {
  const key = process.env.GTMETRIX_API_KEY ?? ''
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64')
}

export async function iniciarAnaliseGtmetrix(url: string): Promise<string> {
  const res = await fetch(`${GTMETRIX_API}/tests`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: { type: 'test', attributes: { url } },
    }),
  })
  if (!res.ok) {
    const texto = await res.text()
    throw new Error(`GTmetrix erro ${res.status}: ${texto}`)
  }
  const json = await res.json()
  return json.data.id as string
}

export async function verificarAnaliseGtmetrix(testeId: string, paginaId: string): Promise<{
  estado: 'pendente' | 'concluido' | 'erro'
  estadoRaw?: string
  grade?: string
  score?: number
  lcp?: number
  tempo?: number
}> {
  const res = await fetch(`${GTMETRIX_API}/tests/${testeId}`, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) throw new Error(`GTmetrix erro ${res.status}`)

  const json = await res.json()
  const attrs = json.data?.attributes ?? {}
  const state = attrs.state as string | undefined

  // Quando completo, GTmetrix não retorna 'state' — retorna os resultados diretamente
  const concluido = state === 'completed' || (!state && !!attrs.gtmetrix_grade)
  const emErro = state === 'error' && !attrs.gtmetrix_grade

  if (emErro) return { estado: 'erro', estadoRaw: 'GTmetrix não conseguiu analisar a página.' }
  if (!concluido) return { estado: 'pendente', estadoRaw: state ?? 'queued' }

  const grade = (attrs.gtmetrix_grade ?? '') as string
  const score = Math.round((attrs.gtmetrix_score ?? 0) as number)
  // LCP em ms → segundos
  const lcp = attrs.largest_contentful_paint
    ? Math.round((attrs.largest_contentful_paint as number) / 10) / 100
    : null
  // Tempo total em ms → segundos
  const tempo = attrs.fully_loaded_time
    ? Math.round((attrs.fully_loaded_time as number) / 10) / 100
    : attrs.onload_time
      ? Math.round((attrs.onload_time as number) / 10) / 100
      : null

  const supabase = await createClient()
  await supabase.from('paginas').update({
    gtmetrix_grade: grade || null,
    gtmetrix_score: score || null,
    gtmetrix_analisado_em: new Date().toISOString(),
    ...(lcp !== null ? { gtmetrix_lcp: lcp } : {}),
    ...(tempo !== null ? { gtmetrix_tempo: tempo } : {}),
  }).eq('id', paginaId)

  return { estado: 'concluido', grade, score, lcp: lcp ?? undefined, tempo: tempo ?? undefined }
}
