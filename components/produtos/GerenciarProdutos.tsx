'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarProduto, atualizarProduto, deletarProduto } from '@/lib/actions/produtos'
import type { Produto, Especialista } from '@/lib/types'

interface Props {
  produtos: Produto[]
  especialistas: Especialista[]
}

export function GerenciarProdutos({ produtos, especialistas }: Props) {
  const router = useRouter()
  const [filtroEsp, setFiltroEsp] = useState('')
  const [form, setForm] = useState({ nome: '', especialista_id: '', descricao: '' })
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null)
  const [erroDelete, setErroDelete] = useState<string | null>(null)
  const [deletados, setDeletados] = useState<Set<string>>(new Set())

  const filtrados = (filtroEsp ? produtos.filter(p => p.especialista_id === filtroEsp) : produtos)
    .filter(p => !deletados.has(p.id))

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.especialista_id) return
    setCriando(true)
    try {
      await criarProduto({ nome: form.nome.trim(), especialista_id: form.especialista_id, descricao: form.descricao || undefined })
      router.refresh()
      setForm({ nome: '', especialista_id: '', descricao: '' })
    } finally {
      setCriando(false)
    }
  }

  async function handleSalvarEdicao(id: string) {
    if (!editando?.nome.trim()) return
    await atualizarProduto(id, { nome: editando.nome.trim() })
    setEditando(null)
    router.refresh()
  }

  async function handleToggleAtivo(p: Produto) {
    await atualizarProduto(p.id, { ativo: !p.ativo })
    router.refresh()
  }

  async function handleDeletar(id: string) {
    setErroDelete(null)
    setDeletados(d => new Set(d).add(id))
    setConfirmandoDelete(null)
    try {
      await deletarProduto(id)
    } catch (e: unknown) {
      setDeletados(d => { const next = new Set(d); next.delete(id); return next })
      setErroDelete(e instanceof Error ? e.message : 'Erro ao excluir produto.')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Produtos</h1>
        <p className="text-gray-500 text-sm mt-1">Produtos vinculados a cada especialista.</p>
      </div>

      {especialistas.length === 0 && (
        <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm">
          Cadastre pelo menos um especialista antes de criar produtos.
        </div>
      )}

      {/* Formulário de criação */}
      <form onSubmit={handleCriar} className="flex gap-2 flex-wrap">
        <Select value={form.especialista_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, especialista_id: v === '__none__' ? '' : v }))}>
          <SelectTrigger className="h-9 text-sm bg-gray-900 border-white/10 text-gray-300 hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
            <SelectValue placeholder="Especialista *" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/10">
            <SelectItem value="__none__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Especialista *</SelectItem>
            {especialistas.map(e => <SelectItem key={e.id} value={e.id} className="text-gray-300 focus:bg-gray-800 focus:text-white">{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="Nome do produto *"
          className="bg-gray-900 border-white/10 text-white placeholder-gray-500 focus:border-indigo-500 flex-1 min-w-40"
        />
        <Button type="submit" disabled={criando || !form.nome.trim() || !form.especialista_id} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shrink-0">
          <Plus size={16} />
          Adicionar
        </Button>
      </form>

      {erroDelete && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start justify-between gap-2">
          <span>{erroDelete}</span>
          <button onClick={() => setErroDelete(null)} className="shrink-0 text-red-400 hover:text-red-300"><X size={14} /></button>
        </div>
      )}

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <Select value={filtroEsp || '__all__'} onValueChange={v => setFiltroEsp(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm bg-gray-900 border-white/10 text-gray-300 hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/10">
            <SelectItem value="__all__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Todos os especialistas</SelectItem>
            {especialistas.map(e => <SelectItem key={e.id} value={e.id} className="text-gray-300 focus:bg-gray-800 focus:text-white">{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-gray-500 text-sm">{filtrados.length} produto{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/60 text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Produto</th>
              <th className="px-4 py-3 text-left font-medium">Especialista</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07]">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            ) : filtrados.map(p => (
              <tr key={p.id} className="hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-3">
                  {editando?.id === p.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editando.nome}
                        onChange={e => setEditando({ id: p.id, nome: e.target.value })}
                        className="bg-gray-900 border-white/10 text-white h-8 text-sm"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSalvarEdicao(p.id)}
                      />
                      <button onClick={() => handleSalvarEdicao(p.id)} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                      <button onClick={() => setEditando(null)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
                    </div>
                  ) : (
                    <span className={`font-medium ${p.ativo ? 'text-white' : 'text-gray-500 line-through'}`}>{p.nome}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">{p.especialistas?.nome ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    p.ativo ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-500 border-gray-500/30'
                  }`}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {confirmandoDelete === p.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeletar(p.id)}
                          className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setConfirmandoDelete(null)}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setEditando({ id: p.id, nome: p.nome })} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-900 rounded transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleToggleAtivo(p)} className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-gray-900 rounded transition-colors" title={p.ativo ? 'Desativar' : 'Ativar'}>
                          {p.ativo ? <X size={13} /> : <Check size={13} />}
                        </button>
                        <button onClick={() => { setConfirmandoDelete(p.id); setErroDelete(null) }} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded transition-colors" title="Excluir produto">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
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
