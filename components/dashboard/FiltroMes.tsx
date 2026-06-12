'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function FiltroMes() {
  const router = useRouter()
  const params = useSearchParams()
  const mesSel = params.get('mes') ?? ''
  const espSel = params.get('especialista') ?? ''

  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    return { valor, label }
  })

  function handleChange(mes: string) {
    const p = new URLSearchParams()
    if (espSel) p.set('especialista', espSel)
    if (mes) p.set('mes', mes)
    router.push(`/dashboard${p.toString() ? '?' + p.toString() : ''}`)
  }

  const valorAtual = mesSel || (meses[0]?.valor ?? '')

  return (
    <Select value={valorAtual} onValueChange={handleChange}>
      <SelectTrigger className="h-9 text-sm bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-gray-800">
        {meses.map(m => (
          <SelectItem key={m.valor} value={m.valor} className="text-gray-300 focus:bg-gray-800 focus:text-white">{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
