import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const result: Record<string, unknown> = {}

  try {
    result.env_url = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    result.env_anon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    result.env_service = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  } catch (e) {
    result.env_error = String(e)
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('usuarios').select('count').single()
    result.db_usuarios = error ? `ERRO: ${error.message}` : 'OK'
  } catch (e) {
    result.db_error = String(e)
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers()
    result.admin_listUsers = error ? `ERRO: ${error.message}` : `OK — ${data.users.length} users`
  } catch (e) {
    result.admin_error = String(e)
  }

  return NextResponse.json(result)
}
