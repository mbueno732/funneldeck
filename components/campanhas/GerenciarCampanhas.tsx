'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarCampanha, atualizarCampanha } from '@/lib/actions/campanhas'
import type { Campanha } from '@/lib/types'

export function GerenciarCampanhas({ campanhas }: { campanhas: Campanha[] }) {
  const router = useRouter()
  const [novoCodigo, setNovoCodigo] = useState('')
  const [criando, setCriando] = useState(false)
  const [erroCriar, setErroCriar] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoCodigo, setEditandoCodigo] = useState('')
  const [erroEditar, setErroEditar] = useState('')

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoCodigo.trim()) return
    setCriando(true)
    setErroCriar('')
    try {
      const res = await criarCampanha({ codigo: novoCodigo.trim() })
      if (!res.ok) { setErroCriar(res.erro ?? 'Erro ao criar campanha.'); return }
      setNovoCodigo('')
      router.refresh()
    } finally {
      setCriando(false)
    }
  }

  async function handleSalvarEdicao(id: string) {
    if (!editandoCodigo.trim()) return
    setErroEditar('')
    const res = await atualizarCampanha(id, { codigo: editandoCodigo.trim() })
    if (!res.ok) { setErroEditar(res.erro ?? 'Erro ao salvar campanha.'); return }
    setEditandoId(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Adicionar */}
      <form onSubmit={handleCriar} className="flex gap-2">
        <Input
          value={novoCodigo}
          onChange={e => setNovoCodigo(e.target.value)}
          placeholder='Código da campanha, ex: "D90"...'
          className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500"
        />
        <Button type="submit" disabled={criando || !novoCodigo.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shrink-0">
          <Plus size={16} />
          Adicionar
        </Button>
      </form>
      {erroCriar && <p className="text-red-400 text-sm">{erroCriar}</p>}

      {/* Lista */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Código</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07]">
            {campanhas.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-slate-500">
                  Nenhuma campanha cadastrada.
                </td>
              </tr>
            ) : campanhas.map(c => (
              <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="px-4 py-3">
                  {editandoId === c.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editandoCodigo}
                        onChange={ev => setEditandoCodigo(ev.target.value)}
                        className="bg-slate-900 border-slate-800 text-white h-8 text-sm"
                        autoFocus
                        onKeyDown={ev => { if (ev.key === 'Enter') handleSalvarEdicao(c.id); if (ev.key === 'Escape') setEditandoId(null) }}
                      />
                      <button onClick={() => handleSalvarEdicao(c.id)} className="text-green-400 hover:text-green-300">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-slate-500 hover:text-slate-300">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="font-medium text-white">{c.codigo}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editandoId !== c.id && (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditandoId(c.id); setEditandoCodigo(c.codigo); setErroEditar('') }}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {erroEditar && <p className="text-red-400 text-sm">{erroEditar}</p>}
    </div>
  )
}
