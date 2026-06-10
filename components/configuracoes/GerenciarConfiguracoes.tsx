'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, X, Pencil, Trash2 } from 'lucide-react'
import { criarConfiguracao, atualizarConfiguracao, deletarConfiguracao } from '@/lib/actions/configuracoes'
import type { Configuracao, CategoriaConfig } from '@/lib/types'

const CATEGORIAS: { key: CategoriaConfig; label: string }[] = [
  { key: 'status_pagina', label: 'Status da Página' },
  { key: 'etapa',         label: 'Etapas' },
  { key: 'ferramenta',    label: 'Ferramentas' },
  { key: 'prioridade',    label: 'Prioridades' },
  { key: 'tipo_funil',    label: 'Tipos de Funil' },
  { key: 'status_funil',  label: 'Status do Funil' },
]

const CORES_RAPIDAS = ['#22c55e','#3b82f6','#f97316','#eab308','#f97316','#ef4444','#6b7280','#a855f7','#ec4899']

interface Props { configs: Configuracao[] }

export function GerenciarConfiguracoes({ configs }: Props) {
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<CategoriaConfig>('status_pagina')
  const [novoValor, setNovoValor] = useState('')
  const [novaCor, setNovaCor] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; valor: string; cor: string } | null>(null)
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null)

  const itens = configs.filter(c => c.categoria === abaAtiva).sort((a, b) => a.ordem - b.ordem)

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoValor.trim()) return
    setAdicionando(true)
    try {
      await criarConfiguracao({ categoria: abaAtiva, valor: novoValor.trim(), cor: novaCor || undefined, ordem: itens.length + 1 })
      setNovoValor('')
      setNovaCor('')
      router.refresh()
    } finally { setAdicionando(false) }
  }

  async function handleSalvarEdicao() {
    if (!editando) return
    await atualizarConfiguracao(editando.id, { valor: editando.valor.trim(), cor: editando.cor || null })
    setEditando(null)
    router.refresh()
  }

  async function handleToggleAtivo(item: Configuracao) {
    await atualizarConfiguracao(item.id, { ativo: !item.ativo })
    router.refresh()
  }

  async function handleDeletar(id: string) {
    await deletarConfiguracao(id)
    setConfirmandoDelete(null)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie as listas de opções usadas em todo o sistema.</p>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-1 border-b border-gray-800 pb-0">
        {CATEGORIAS.map(cat => (
          <button
            key={cat.key}
            onClick={() => setAbaAtiva(cat.key)}
            className={`px-3 py-2 text-sm rounded-t-lg transition-colors -mb-px ${
              abaAtiva === cat.key
                ? 'bg-gray-800 text-white border border-b-gray-800 border-gray-700'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Formulário de adição */}
      <form onSubmit={handleAdicionar} className="flex items-center gap-2">
        <input
          value={novoValor}
          onChange={e => setNovoValor(e.target.value)}
          placeholder="Novo item..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {CORES_RAPIDAS.map(c => (
            <button
              key={c} type="button"
              onClick={() => setNovaCor(novaCor === c ? '' : c)}
              className={`w-5 h-5 rounded-full transition-all ${novaCor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={adicionando || !novoValor.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
        >
          <Plus size={14} /> Adicionar
        </button>
      </form>

      {/* Lista de itens */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Valor</th>
              <th className="px-4 py-3 text-left font-medium">Cor</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {itens.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-xs">
                  Nenhum item nesta categoria.
                </td>
              </tr>
            ) : itens.map(item => (
              <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3">
                  {editando?.id === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editando.valor}
                        onChange={e => setEditando(ed => ed ? { ...ed, valor: e.target.value } : ed)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSalvarEdicao(); if (e.key === 'Escape') setEditando(null) }}
                        className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button onClick={handleSalvarEdicao} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                      <button onClick={() => setEditando(null)} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
                    </div>
                  ) : (
                    <span className={`font-medium ${item.ativo ? 'text-white' : 'text-gray-500 line-through'}`}>
                      {item.valor}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editando?.id === item.id ? (
                    <div className="flex items-center gap-1">
                      {CORES_RAPIDAS.map(c => (
                        <button
                          key={c} type="button"
                          onClick={() => setEditando(ed => ed ? { ...ed, cor: ed.cor === c ? '' : c } : ed)}
                          className={`w-4 h-4 rounded-full transition-all ${editando.cor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-110' : 'opacity-50 hover:opacity-100'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  ) : item.cor ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
                      <span className="text-gray-500 text-xs font-mono">{item.cor}</span>
                    </span>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    item.ativo
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'bg-gray-500/10 text-gray-500 border-gray-500/30'
                  }`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {confirmandoDelete === item.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs text-gray-400">Deletar?</span>
                      <button onClick={() => handleDeletar(item.id)} className="p-1 text-red-400 hover:text-red-300"><Check size={12} /></button>
                      <button onClick={() => setConfirmandoDelete(null)} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditando({ id: item.id, valor: item.valor, cor: item.cor ?? '' })}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      ><Pencil size={12} /></button>
                      <button
                        onClick={() => handleToggleAtivo(item)}
                        className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-gray-700 rounded transition-colors"
                        title={item.ativo ? 'Desativar' : 'Ativar'}
                      >{item.ativo ? <X size={12} /> : <Check size={12} />}</button>
                      <button
                        onClick={() => setConfirmandoDelete(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                      ><Trash2 size={12} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
