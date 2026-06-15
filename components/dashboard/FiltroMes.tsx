'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  mesesDisponiveis: string[] // formato YYYY-MM, já ordenados desc
}

export function FiltroMes({ mesesDisponiveis }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const mesSel = params.get('mes') ?? ''
  const espSel = params.get('especialista') ?? ''

  function handleChange(mes: string) {
    const p = new URLSearchParams()
    if (espSel) p.set('especialista', espSel)
    if (mes && mes !== '__all__') p.set('mes', mes)
    router.push(`/dashboard${p.toString() ? '?' + p.toString() : ''}`)
  }

  function formatarMes(ym: string) {
    const [ano, mes] = ym.split('-')
    const d = new Date(Number(ano), Number(mes) - 1, 1)
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  }

  const valorAtual = mesSel || '__all__'

  return (
    <Select value={valorAtual} onValueChange={handleChange}>
      <SelectTrigger className="h-9 text-sm bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-gray-800">
        <SelectItem value="__all__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Todo o período</SelectItem>
        {mesesDisponiveis.map(m => (
          <SelectItem key={m} value={m} className="text-gray-300 focus:bg-gray-800 focus:text-white">
            {formatarMes(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
