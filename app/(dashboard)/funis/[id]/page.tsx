import { redirect } from 'next/navigation'

export default function FunilDetalhePage({ params }: { params: { id: string } }) {
  redirect(`/paginas?funil=${params.id}`)
}
