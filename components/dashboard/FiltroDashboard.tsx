'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Especialista } from '@/lib/types'

export function FiltroDashboard({ especialistas }: { especialistas: Especialista[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const atual = params.get('especialista') ?? ''

  function handleChange(id: string) {
    const url = id ? `/dashboard?especialista=${id}` : '/dashboard'
    router.push(url)
  }

  return (
    <select
      value={atual}
      onChange={e => handleChange(e.target.value)}
      className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500 h-9"
    >
      <option value="">Todos os especialistas</option>
      {especialistas.map(e => (
        <option key={e.id} value={e.id}>{e.nome}</option>
      ))}
    </select>
  )
}
