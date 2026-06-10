'use server'
import { createClient } from '@/lib/supabase/server'

export async function criarChecklistManual(pagina_id: string) {
  const supabase = await createClient()

  const { data: existente } = await supabase
    .from('checklists_publicacao')
    .select('id')
    .eq('pagina_id', pagina_id)
    .single()

  if (existente) return existente

  const { data: checklist, error } = await supabase
    .from('checklists_publicacao')
    .insert({ pagina_id })
    .select()
    .single()
  if (error) throw error

  const itens = [
    { fase: 'setup', item: 'URL da página definida e configurada', ordem: 1 },
    { fase: 'setup', item: 'Meta description incluída', ordem: 2 },
    { fase: 'setup', item: 'Social preview (OG image) configurada', ordem: 3 },
    { fase: 'setup', item: 'Favicon do funil incluído', ordem: 4 },
    { fase: 'setup', item: 'Analytics conectado (GA4, GTM ou Pixel)', ordem: 5 },
    { fase: 'desenvolvimento', item: 'Layout responsivo revisado (mobile e desktop)', ordem: 1 },
    { fase: 'desenvolvimento', item: 'Imagens em formato otimizado (WebP)', ordem: 2 },
    { fase: 'desenvolvimento', item: 'Formulário(s) configurado(s) e integração ativa', ordem: 3 },
    { fase: 'desenvolvimento', item: 'Integrações ativas (CRM, ActiveCampaign, etc.)', ordem: 4 },
    { fase: 'desenvolvimento', item: 'Parâmetros UTM sendo capturados', ordem: 5 },
    { fase: 'testes', item: 'Todos os botões de CTA testados', ordem: 1 },
    { fase: 'testes', item: 'Todos os links testados', ordem: 2 },
    { fase: 'testes', item: 'Formulário de conversão testado com dado real', ordem: 3 },
    { fase: 'testes', item: 'Teste real no celular físico', ordem: 4 },
    { fase: 'performance', item: 'GTmetrix executado', ordem: 1 },
    { fase: 'performance', item: 'Otimizações aplicadas se necessário', ordem: 2 },
  ].map(i => ({ ...i, checklist_id: checklist.id }))

  await supabase.from('checklist_itens').insert(itens)
  return checklist
}

export async function buscarChecklist(pagina_id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('checklists_publicacao')
    .select('*, checklist_itens(*)')
    .eq('pagina_id', pagina_id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function toggleItemChecklist(item_id: string, concluido: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('checklist_itens')
    .update({ concluido })
    .eq('id', item_id)
  if (error) throw error
}

export async function atualizarChecklistMeta(checklist_id: string, input: {
  vsl_ativo?: boolean
  observacao_geral?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('checklists_publicacao')
    .update(input)
    .eq('id', checklist_id)
  if (error) throw error
}
