import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Usa service role key para bypassar RLS — acesso público para uso interno
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
