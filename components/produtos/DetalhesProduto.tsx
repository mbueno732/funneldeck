'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModalPagina } from '@/components/paginas/ModalPagina'
import { ModalFunil } from '@/components/funis/ModalFunil'
import { deletarPagina } from '@/lib/actions/paginas'
import type { Produto, Pagina, Funil, Configuracao, Estrategia, Especialista } from '@/lib/types'

const STATUS_COR: Record<string, string> = {
  'Publicada':    '#22c55e',
  'Implementada': '#f59e0b',
  'Em andamento': '#6366f1',
  'A fazer':      '#6b7280',
  'Suspensa':     '#ef4444',
}

const TIPO_COR: Record<string, string> = {
  'Lançamento': '#6366f1',
  'Perpétuo':   '#22c55e',
  'Webinar':    '#f59e0b',
  'Live':       '#f97316',
  'Evento':     '#ec4899',
  'VSL':        '#8b5cf6',
}

interface Props {
  produto: Produto & { especialistas?: { id: string; nome: string } | null }
  paginas: Pagina[]
  funis: Funil[]
  configs: Configuracao[]
  estrategias: Estrategia[]
  todosProdutos: Produto[]
  especialistas: Especialista[]
}

export function DetalhesProduto({ produto, paginas, funis, configs, estrategias, todosProdutos, especialistas }: Props) {
  const router = useRouter()
  const [aba, setAba] = useState<'paginas' | 'funis'>('paginas')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Pagina | null>(null)
  const [modalFunilAberto, setModalFunilAberto] = useState(false)
  const [deletandoPagina, setDeletandoPagina] = useState<string | null>(null)
  const [deletadas, setDeletadas] = useState<Set<string>>(new Set())
  const [paginasState, setPaginasState] = useState<Pagina[]>(paginas)

  const colorMap = configs.reduce((acc, c) => ({ ...acc, [`${c.categoria}:${c.valor}`]: c.cor }), {} as Record<string, string | null | undefined>)
  const cor = (cat: string, val: string) => colorMap[`${cat}:${val}`] ?? null

  async function handleDeletar(id: string) {
    setDeletadas(d => new Set(d).add(id))
    setDeletandoPagina(null)
    try {
      await deletarPagina(id)
      setPaginasState(prev => prev.filter(p => p.id !== id))
    } catch {
      setDeletadas(d => { const next = new Set(d); next.delete(id); return next })
    }
  }

  const paginasVisiveis = paginasState.filter(p => !deletadas.has(p.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/produtos" className="mt-1 p-1.5 text-gray-500 hover:text-white hover:bg-gray-900 rounded transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{produto.nome}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              produto.ativo
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-gray-500/10 text-gray-500 border-gray-500/30'
            }`}>
              {produto.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {produto.especialistas?.nome && (
            <p className="text-gray-500 text-sm mt-0.5">
              Especialista: <span className="text-gray-300">{produto.especialistas.nome}</span>
            </p>
          )}
        </div>
        <Link
          href={`/paginas?produto=${produto.id}`}
          className="shrink-0 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 rounded-lg transition-colors"
        >
          Ver no Mapa de Páginas
        </Link>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-800">
        {([
          { id: 'paginas', label: `Páginas${paginasVisiveis.length > 0 ? ` (${paginasVisiveis.length})` : ''}` },
          { id: 'funis',   label: `Funis${funis.length > 0 ? ` (${funis.length})` : ''}` },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              aba === tab.id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba Páginas */}
      {aba === 'paginas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">Páginas permanentes — reaproveitadas em todos os lançamentos deste produto.</p>
            <Button
              onClick={() => { setEditando(null); setModalAberto(true) }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <Plus size={16} />
              Nova Página
            </Button>
          </div>

          {paginasVisiveis.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 px-6 py-12 text-center">
              <p className="text-gray-400 font-medium">Nenhuma página permanente ainda.</p>
              <p className="text-gray-600 text-sm mt-1">Adicione páginas que são reaproveitadas em todos os lançamentos deste produto.</p>
              <p className="text-gray-600 text-sm">Exemplos: Página de Vendas, Página de Indicação, Checkout.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900/60 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Página</th>
                    <th className="px-4 py-3 text-left font-medium">Etapa</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Ferramenta</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {paginasVisiveis.map(p => (
                    <tr key={p.id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.codigo && (
                            <span className="text-violet-400 font-mono text-xs bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded shrink-0">{p.codigo}</span>
                          )}
                          <span className="text-white font-medium">{p.nome}</span>
                          {p.url_pagina && (
                            <a href={p.url_pagina} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 shrink-0">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.etapa ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: STATUS_COR[p.status] ?? '#6b7280' }}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.ferramenta ? (
                          <span className="text-xs" style={{ color: cor('ferramenta', p.ferramenta) ?? '#9ca3af' }}>{p.ferramenta}</span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {deletandoPagina === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDeletar(p.id)} className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-500 rounded font-medium">Excluir</button>
                            <button onClick={() => setDeletandoPagina(null)} className="px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 rounded">Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => { setEditando(p); setModalAberto(true) }} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-900 rounded transition-colors" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeletandoPagina(p.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded transition-colors" title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Aba Funis */}
      {aba === 'funis' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setModalFunilAberto(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Plus size={16} />
              Novo Funil
            </Button>
          </div>
          {funis.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 px-6 py-12 text-center">
              <p className="text-gray-400 font-medium">Nenhum funil vinculado a este produto.</p>
              <p className="text-gray-600 text-sm mt-1">Crie um funil acima ou em <Link href="/funis" className="text-indigo-400 hover:text-indigo-300">Funis</Link>.</p>
            </div>
          ) : funis.map(f => (
            <Link
              key={f.id}
              href={`/funis/${f.id}`}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-800 hover:border-gray-600 bg-gray-900/30 hover:bg-gray-900/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                {f.tipo && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full border font-medium shrink-0"
                    style={{
                      color: TIPO_COR[f.tipo] ?? '#6b7280',
                      backgroundColor: `${TIPO_COR[f.tipo] ?? '#6b7280'}15`,
                      borderColor: `${TIPO_COR[f.tipo] ?? '#6b7280'}30`,
                    }}
                  >
                    {f.tipo}
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    {f.id_funil && <span className="text-indigo-400 font-mono text-xs">[{f.id_funil}]</span>}
                    <span className="text-white font-medium">{f.nome}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{f.status}</span>
                </div>
              </div>
              <ChevronLeft size={14} className="text-gray-600 group-hover:text-gray-400 rotate-180 transition-colors" />
            </Link>
          ))}
        </div>
      )}

      <ModalPagina
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setEditando(null) }}
        onSalvo={() => { setModalAberto(false); setEditando(null); router.refresh() }}
        pagina={editando}
        funis={funis}
        configs={configs}
        estrategias={estrategias}
        produtos={todosProdutos}
        produtoPreSelecionado={editando ? undefined : produto.id}
      />

      <ModalFunil
        aberto={modalFunilAberto}
        onFechar={() => setModalFunilAberto(false)}
        onSalvo={() => { setModalFunilAberto(false); router.refresh() }}
        funil={null}
        produtos={todosProdutos}
        especialistas={especialistas}
        configs={configs}
      />
    </div>
  )
}
