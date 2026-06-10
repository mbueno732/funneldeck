import { NextRequest, NextResponse } from 'next/server'

// Stub — implementar após conectar o Supabase
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const entidade = searchParams.get('entidade') ?? 'paginas'

  return new NextResponse(`id,nome\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entidade}.csv"`,
    },
  })
}
