'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    <Select value={atual || '__all__'} onValueChange={v => handleChange(v === '__all__' ? '' : v)}>
      <SelectTrigger className="h-9 text-sm bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-slate-800">
        <SelectItem value="__all__" className="text-slate-300 focus:bg-slate-800 focus:text-white">Todos os especialistas</SelectItem>
        {especialistas.map(e => (
          <SelectItem key={e.id} value={e.id} className="text-slate-300 focus:bg-slate-800 focus:text-white">{e.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
