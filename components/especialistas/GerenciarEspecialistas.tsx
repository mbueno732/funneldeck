'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarEspecialista, atualizarEspecialista } from '@/lib/actions/especialistas'
import type { Especialista } from '@/lib/types'

export function GerenciarEspecialistas({ especialistas }: { especialistas: Especialista[] }) {
  const router = useRouter()
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [ativoOverrides, setAtivoOverrides] = useState<Record<string, boolean>>({})

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      await criarEspecialista({ nome: novoNome.trim() })
      setNovoNome('')
      router.refresh()
    } finally {
      setCriando(false)
    }
  }

  async function handleSalvarEdicao(id: string) {
    if (!editandoNome.trim()) return
    await atualizarEspecialista(id, { nome: editandoNome.trim() })
    setEditandoId(null)
    router.refresh()
  }

  async function handleToggleAtivo(e: Especialista) {
    const novoAtivo = !( e.id in ativoOverrides ? ativoOverrides[e.id] : e.ativo)
    setAtivoOverrides(o => ({ ...o, [e.id]: novoAtivo }))
    await atualizarEspecialista(e.id, { ativo: novoAtivo })
  }

  return (
    <div className="space-y-4">
      {/* Adicionar */}
      <form onSubmit={handleCriar} className="flex gap-2">
        <Input
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          placeholder="Nome do especialista..."
          className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500"
        />
        <Button type="submit" disabled={criando || !novoNome.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shrink-0">
          <Plus size={16} />
          Adicionar
        </Button>
      </form>

      {/* Lista */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07]">
            {especialistas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                  Nenhum especialista cadastrado.
                </td>
              </tr>
            ) : especialistas.map(e => {
              const ativo = e.id in ativoOverrides ? ativoOverrides[e.id] : e.ativo
              return (
              <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="px-4 py-3">
                  {editandoId === e.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editandoNome}
                        onChange={ev => setEditandoNome(ev.target.value)}
                        className="bg-slate-900 border-slate-800 text-white h-8 text-sm"
                        autoFocus
                        onKeyDown={ev => ev.key === 'Enter' && handleSalvarEdicao(e.id)}
                      />
                      <button onClick={() => handleSalvarEdicao(e.id)} className="text-green-400 hover:text-green-300">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-slate-500 hover:text-slate-300">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className={`font-medium ${ativo ? 'text-white' : 'text-slate-500 line-through'}`}>
                      {e.nome}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    ativo
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                  }`}>
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => { setEditandoId(e.id); setEditandoNome(e.nome) }}
                      className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(e)}
                      className="p-1.5 text-slate-500 hover:text-yellow-400 hover:bg-slate-900 rounded transition-colors text-xs"
                      title={ativo ? 'Desativar' : 'Ativar'}
                    >
                      {ativo ? <X size={13} /> : <Check size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
