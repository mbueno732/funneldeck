import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const keyInfo = {
    set: key.length > 0,
    length: key.length,
    prefix: key.slice(0, 12),
    isJwt: key.startsWith('eyJ'),
  }

  const supabase = await createClient()

  // Teste 1: SELECT
  const { data: selectData, error: selectError } = await supabase
    .from('estrategias')
    .select('id, nome, funil_id')
    .limit(3)

  // Teste 2: INSERT usando um funil_id real (primeiro que existir no banco)
  const { data: funilRow } = await supabase.from('funis').select('id').limit(1).single()
  const testFunilId = funilRow?.id ?? null
  const { data: insertData, error: insertError } = testFunilId
    ? await supabase.from('estrategias').insert({ funil_id: testFunilId, nome: '__debug_test__' }).select().single()
    : { data: null, error: { message: 'Nenhum funil encontrado para teste' } as { message: string } }

  // Teste 3: DELETE da linha teste (se inseriu)
  let deleteCount: number | null = null
  let deleteError: string | null = null
  if (insertData) {
    const { error: delErr, count } = await supabase
      .from('estrategias')
      .delete({ count: 'exact' })
      .eq('id', (insertData as { id: string }).id)
    deleteCount = count
    deleteError = delErr?.message ?? null
  }

  return NextResponse.json({
    key: keyInfo,
    select: {
      ok: !selectError,
      error: selectError?.message ?? null,
      rows: selectData ?? [],
    },
    insert: {
      ok: !insertError && !!insertData,
      error: insertError?.message ?? null,
      id: (insertData as { id?: string } | null)?.id ?? null,
    },
    delete: {
      count: deleteCount,
      error: deleteError,
    },
  })
}
