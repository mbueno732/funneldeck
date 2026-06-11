'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function registrarAuditoria(
  entidade: string,
  entidade_id: string,
  acao: string,
  detalhes?: Record<string, unknown>
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('historico_alteracoes').insert({
      entidade,
      entidade_id,
      usuario_id: null,
      acao,
      detalhes: detalhes ?? null,
    })
    if (error) console.error('[auditoria]', error.message)
  } catch (e) {
    console.error('[auditoria] erro inesperado:', e)
  }
}
