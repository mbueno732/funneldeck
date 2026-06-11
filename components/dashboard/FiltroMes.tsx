'use client'
import { useRouter, useSearchParams } from 'next/navigation'

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

  return (
    <select
      value={mesSel}
      onChange={e => handleChange(e.target.value)}
      className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500 h-9"
    >
      {meses.map(m => (
        <option key={m.valor} value={m.valor}>{m.label}</option>
      ))}
    </select>
  )
}
