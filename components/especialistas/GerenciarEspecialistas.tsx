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
    await atualizarEspecialista(e.id, { ativo: !e.ativo })
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Especialistas</h1>
        <p className="text-gray-500 text-sm mt-1">Criadores e experts cujos produtos são gerenciados.</p>
      </div>

      {/* Adicionar */}
      <form onSubmit={handleCriar} className="flex gap-2">
        <Input
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          placeholder="Nome do especialista..."
          className="bg-gray-900 border-white/10 text-white placeholder-gray-500 focus:border-indigo-500"
        />
        <Button type="submit" disabled={criando || !novoNome.trim()} className="bg-indigo-600 hover:bg-indigo-500 gap-2 shrink-0">
          <Plus size={16} />
          Adicionar
        </Button>
      </form>

      {/* Lista */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/60 text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07]">
            {especialistas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-gray-500">
                  Nenhum especialista cadastrado.
                </td>
              </tr>
            ) : especialistas.map(e => (
              <tr key={e.id} className="hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-3">
                  {editandoId === e.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editandoNome}
                        onChange={ev => setEditandoNome(ev.target.value)}
                        className="bg-gray-900 border-white/10 text-white h-8 text-sm"
                        autoFocus
                        onKeyDown={ev => ev.key === 'Enter' && handleSalvarEdicao(e.id)}
                      />
                      <button onClick={() => handleSalvarEdicao(e.id)} className="text-green-400 hover:text-green-300">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-gray-500 hover:text-gray-300">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className={`font-medium ${e.ativo ? 'text-white' : 'text-gray-500 line-through'}`}>
                      {e.nome}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    e.ativo
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'bg-gray-500/10 text-gray-500 border-gray-500/30'
                  }`}>
                    {e.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => { setEditandoId(e.id); setEditandoNome(e.nome) }}
                      className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-900 rounded transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(e)}
                      className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-gray-900 rounded transition-colors text-xs"
                      title={e.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {e.ativo ? <X size={13} /> : <Check size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
