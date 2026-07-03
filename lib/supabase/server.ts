import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Usa service role key para bypassar RLS — acesso público para uso interno
// fetch com cache:'no-store' evita que Next.js 14 sirva respostas cacheadas do Supabase
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
    }
  )
}
