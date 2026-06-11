import { NextResponse, type NextRequest } from 'next/server'

// Auth desabilitado — acesso público para uso interno
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request })
}
