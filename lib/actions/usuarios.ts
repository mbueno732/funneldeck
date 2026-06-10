'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://funneldeck.vercel.app'

export async function listarUsuarios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, perfil, criado_em')
    .order('criado_em', { ascending: true })
  if (error) throw error
  return data
}

export async function convidarUsuario(email: string) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?intent=invite`,
  })
  if (error) throw error
  revalidatePath('/usuarios')
}

export async function atualizarPerfilUsuario(id: string, perfil: 'editor' | 'visualizador') {
  const admin = createAdminClient()
  const { error } = await admin.from('usuarios').update({ perfil }).eq('id', id)
  if (error) throw error
  revalidatePath('/usuarios')
}
