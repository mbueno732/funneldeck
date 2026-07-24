'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Check, X, Trash2, ChevronRight, FileText, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarProduto, atualizarProduto, deletarProduto } from '@/lib/actions/produtos'
import type { Produto, Especialista } from '@/lib/types'

interface Props {
  produtos: Produto[]
  especialistas: Especialista[]
  paginasCounts?: Record<string, number>
  funisCounts?: Record<string, number>
}

export function GerenciarProdutos({ produtos, especialistas, paginasCounts = {}, funisCounts = {} }: Props) {
  const router = useRouter()
  const [lista, setLista] = useState<Produto[]>(produtos)
  const [filtroEsp, setFiltroEsp] = useState('')
  const [form, setForm] = useState({ nome: '', especialista_id: '', descricao: '' })
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; nome: string; especialista_id: string } | null>(null)
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null)
  const [erroDelete, setErroDelete] = useState<string | null>(null)
  const [deletados, setDeletados] = useState<Set<string>>(new Set())

  const filtrados = (filtroEsp ? lista.filter(p => p.especialista_id === filtroEsp) : lista)
    .filter(p => !deletados.has(p.id))

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.especialista_id) return
    setCriando(true)

    const tempId = `temp-${Date.now()}`
    const esp = especialistas.find(e => e.id === form.especialista_id)
    const optimista: Produto = {
      id: tempId,
      nome: form.nome.trim(),
      especialista_id: form.especialista_id,
      descricao: form.descricao || null,
      ativo: true,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      especialistas: esp ? { id: esp.id, nome: esp.nome } : undefined,
    }
    setLista(prev => [...prev, optimista])
    setForm({ nome: '', especialista_id: form.especialista_id, descricao: '' })

    try {
      const real = await criarProduto({ nome: optimista.nome, especialista_id: form.especialista_id, descricao: form.descricao || undefined })
      setLista(prev => prev.map(p => p.id === tempId
        ? { ...real, especialistas: esp ? { id: esp.id, nome: esp.nome } : undefined }
        : p
      ))
    } catch {
      setLista(prev => prev.filter(p => p.id !== tempId))
    } finally {
      setCriando(false)
    }
  }

  async function handleSalvarEdicao(id: string) {
    if (!editando?.nome.trim()) return
    const esp = especialistas.find(e => e.id === editando.especialista_id)
    setLista(prev => prev.map(p => p.id === id ? {
      ...p,
      nome: editando.nome.trim(),
      especialista_id: editando.especialista_id,
      especialistas: esp ? { id: esp.id, nome: esp.nome } : p.especialistas,
    } : p))
    setEditando(null)
    await atualizarProduto(id, { nome: editando.nome.trim(), especialista_id: editando.especialista_id })
    router.refresh()
  }

  async function handleToggleAtivo(p: Produto) {
    setLista(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x))
    await atualizarProduto(p.id, { ativo: !p.ativo })
  }

  async function handleDeletar(id: string) {
    setErroDelete(null)
    setDeletados(d => new Set(d).add(id))
    setConfirmandoDelete(null)
    try {
      await deletarProduto(id)
      setLista(prev => prev.filter(p => p.id !== id))
    } catch (e: unknown) {
      setDeletados(d => { const next = new Set(d); next.delete(id); return next })
      setErroDelete(e instanceof Error ? e.message : 'Erro ao excluir produto.')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Produtos</h1>
        <p className="text-slate-500 text-sm mt-1">Produtos vinculados a cada especialista.</p>
      </div>

      {especialistas.length === 0 && (
        <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm">
          Cadastre pelo menos um especialista antes de criar produtos.
        </div>
      )}

      {/* Formulário de criação */}
      <form onSubmit={handleCriar} className="flex gap-2 flex-wrap">
        <Select value={form.especialista_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, especialista_id: v === '__none__' ? '' : v }))}>
          <SelectTrigger className="h-9 text-sm bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
            <SelectValue placeholder="Especialista *" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="__none__" className="text-slate-300 focus:bg-slate-800 focus:text-white">Especialista *</SelectItem>
            {especialistas.map(e => <SelectItem key={e.id} value={e.id} className="text-slate-300 focus:bg-slate-800 focus:text-white">{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="Nome do produto *"
          className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 flex-1 min-w-40"
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
          <SelectTrigger className="h-9 text-sm bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="__all__" className="text-slate-300 focus:bg-slate-800 focus:text-white">Todos os especialistas</SelectItem>
            {especialistas.map(e => <SelectItem key={e.id} value={e.id} className="text-slate-300 focus:bg-slate-800 focus:text-white">{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-slate-500 text-sm">{filtrados.length} produto{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Produto</th>
              <th className="px-4 py-3 text-left font-medium">Especialista</th>
              <th className="px-4 py-3 text-left font-medium">Funis</th>
              <th className="px-4 py-3 text-left font-medium">Páginas</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07]">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            ) : filtrados.map(p => (
              <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="px-4 py-3">
                  {editando?.id === p.id ? (
                    <Input
                      value={editando.nome}
                      onChange={e => setEditando(prev => prev ? { ...prev, nome: e.target.value } : null)}
                      className="bg-slate-900 border-slate-800 text-white h-8 text-sm"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSalvarEdicao(p.id)}
                    />
                  ) : (
                    <span className={`font-medium ${p.ativo ? 'text-white' : 'text-slate-500 line-through'}`}>{p.nome}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editando?.id === p.id ? (
                    <Select value={editando.especialista_id || '__none__'} onValueChange={v => setEditando(prev => prev ? { ...prev, especialista_id: v === '__none__' ? '' : v } : null)}>
                      <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-800 text-white focus:ring-0 focus:ring-offset-0 min-w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        {especialistas.map(e => <SelectItem key={e.id} value={e.id} className="text-slate-300 focus:bg-slate-800 focus:text-white text-xs">{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-slate-400">{p.especialistas?.nome ?? '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(funisCounts[p.id] ?? 0) > 0 ? (
                    <Link href={`/funis?produto=${p.id}`} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      <GitBranch size={11} />
                      {funisCounts[p.id]}
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(paginasCounts[p.id] ?? 0) > 0 ? (
                    <Link href={`/paginas?produto=${p.id}`} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                      <FileText size={11} />
                      {paginasCounts[p.id]}
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    p.ativo ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                  }`}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {editando?.id === p.id ? (
                      <>
                        <button onClick={() => handleSalvarEdicao(p.id)} className="text-green-400 hover:text-green-300 p-1"><Check size={15} /></button>
                        <button onClick={() => setEditando(null)} className="text-slate-500 hover:text-slate-300 p-1"><X size={15} /></button>
                      </>
                    ) : confirmandoDelete === p.id ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeletar(p.id)} className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors">Excluir</button>
                        <button onClick={() => setConfirmandoDelete(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <Link href={`/produtos/${p.id}`} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded transition-colors" title="Ver produto">
                          <ChevronRight size={13} />
                        </Link>
                        <button onClick={() => setEditando({ id: p.id, nome: p.nome, especialista_id: p.especialista_id })} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded transition-colors" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleToggleAtivo(p)} className="p-1.5 text-slate-500 hover:text-yellow-400 hover:bg-slate-900 rounded transition-colors" title={p.ativo ? 'Desativar' : 'Ativar'}>
                          {p.ativo ? <X size={13} /> : <Check size={13} />}
                        </button>
                        <button onClick={() => { setConfirmandoDelete(p.id); setErroDelete(null) }} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition-colors" title="Excluir produto">
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
