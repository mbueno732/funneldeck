'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function createUntypedClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function registrarAuditoria(
  entidade: string,
  entidade_id: string,
  acao: string,
  detalhes?: Record<string, unknown>
) {
  const supabase = await createUntypedClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('historico_alteracoes').insert({
    entidade,
    entidade_id,
    usuario_id: user?.id ?? null,
    acao,
    detalhes: detalhes ?? null,
  })
}
