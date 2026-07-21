export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { buscarTesteAB } from '@/lib/actions/testes-ab'
import { DetalheTesteAB } from '@/components/testes-ab/variantes/DetalheTesteAB'

export default async function DetalheTestePage({ params }: { params: { id: string } }) {
  const teste = await buscarTesteAB(params.id)
  if (!teste) notFound()

  return <DetalheTesteAB teste={teste} />
}
