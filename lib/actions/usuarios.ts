'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://funneldeck.vercel.app'

export async function listarUsuarios() {
  const admin = createAdminClient()
  const supabase = await createClient()

  const [{ data }, authResult] = await Promise.all([
    supabase.from('usuarios').select('id, nome, email, perfil, criado_em').order('criado_em', { ascending: true }),
    admin.auth.admin.listUsers(),
  ])

  const authUsers = authResult.data?.users ?? []

  return (data ?? []).map(u => {
    const authUser = authUsers.find(a => a.id === u.id)
    return { ...u, nunca_entrou: !authUser?.last_sign_in_at }
  })
}

export async function convidarUsuario(email: string) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?intent=invite`,
  })
  if (error) throw error
  revalidatePath('/usuarios')
}

export async function reenviarConvite(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?intent=invite`,
  })
  if (error) throw error
}

export async function atualizarPerfilUsuario(id: string, perfil: 'editor' | 'visualizador') {
  const admin = createAdminClient()
  const { error } = await admin.from('usuarios').update({ perfil }).eq('id', id)
  if (error) throw error
  revalidatePath('/usuarios')
}
