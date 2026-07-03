'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

import { ChevronLeft, Clock, LayoutGrid, Layers, Plus, Pencil, Trash2, Link as LinkIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapaPaginas } from '@/components/paginas/MapaPaginas'
import { ModalEstrategia } from './ModalEstrategia'
import { listarEstrategias, listarAtribuicoesPaginas, deletarEstrategia } from '@/lib/actions/estrategias'
import { atualizarPagina } from '@/lib/actions/paginas'
import type { Pagina, Funil, Configuracao, Estrategia } from '@/lib/types'

interface HistoricoEvento {
  id: string
  status_anterior: string | null
  status_novo: string
  criado_em: string
  pagina_id: string
  paginas: { id: string; nome: string; etapa: string | null } | null
}

interface Props {
  funil: Funil & { produtos?: { nome: string; especialistas?: { nome: string } | null } | null }
  paginas: Pagina[]
  paginasProduto?: Pagina[]
  historico: HistoricoEvento[]
  configs: Configuracao[]
  estrategias: Estrategia[]
}

const STATUS_COR: Record<string, string> = {
  'Publicada':    '#22c55e',
  'Implementada': '#f59e0b',
  'Em andamento': '#6366f1',
  'A fazer':      '#6b7280',
  'Suspensa':     '#ef4444',
  'Pausada':      '#f97316',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function DetalhesFunil({ funil, paginas, paginasProduto = [], historico, configs, estrategias }: Props) {
  const TAB_KEY = `funil-tab-${funil.id}`
  const [aba, setAba] = useState<'timeline' | 'paginas' | 'estrategias'>('timeline')
  const [estrategiasState, setEstrategiasState] = useState<Estrategia[]>(estrategias)

  useEffect(() => {
    const saved = sessionStorage.getItem(TAB_KEY) as 'timeline' | 'paginas' | 'estrategias' | null
    if (saved) { setAba(saved); sessionStorage.removeItem(TAB_KEY) }
  }, [TAB_KEY])

  // Ao abrir a aba Estratégias, sincroniza silenciosamente com o banco
  useEffect(() => {
    if (aba !== 'estrategias') return
    Promise.all([
      listarEstrategias(funil.id),
      listarAtribuicoesPaginas(funil.id),
    ])
      .then(([estrategiasDB, atribuicoes]) => {
        setEstrategiasState(estrategiasDB)
        const overrides: Record<string, string | null> = {}
        atribuicoes.forEach(p => { overrides[p.id] = p.estrategia_id })
        setEstategiaOverrides(overrides)
      })
      .catch(() => {})
  }, [aba, funil.id])

  const [modalEstrategiaAberto, setModalEstrategiaAberto] = useState(false)
  const [editandoEstrategia, setEditandoEstrategia] = useState<Estrategia | null>(null)
  const [deletandoEstrategia, setDeletandoEstrategia] = useState<string | null>(null)
  const [deletandoConfirmado, setDeletandoConfirmado] = useState<string | null>(null)
  const [erroEstrategia, setErroEstrategia] = useState<string | null>(null)
  const [atribuindo, setAtribuindo] = useState<string | null>(null)
  const [estrategiaOverrides, setEstategiaOverrides] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {}
    paginas.forEach(p => { init[p.id] = p.estrategia_id ?? null })
    return init
  })

  const especialistaNome = funil.produtos?.especialistas?.nome
  const produtoNome = funil.produtos?.nome

  // Monta eventos da timeline: criação do funil + histórico de status
  type Evento = {
    id: string
    data: string
    titulo: string
    detalhe?: string
    status?: string
    tipo: 'funil' | 'pagina'
  }

  const eventos: Evento[] = [
    {
      id: 'criacao-funil',
      tipo: 'funil' as const,
      data: funil.criado_em,
      titulo: 'Funil criado',
      detalhe: funil.nome,
    },
    ...historico.map(h => ({
      id: h.id,
      tipo: 'pagina' as const,
      data: h.criado_em,
      titulo: h.paginas?.nome ?? '—',
      detalhe: h.status_anterior ? `${h.status_anterior} → ${h.status_novo}` : h.status_novo,
      status: h.status_novo,
    })),
  ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

  // Agrupa por data para separadores visuais
  const porData: { data: string; eventos: Evento[] }[] = []
  for (const ev of eventos) {
    const dia = ev.data.split('T')[0]
    const grupo = porData.find(g => g.data === dia)
    if (grupo) grupo.eventos.push(ev)
    else porData.push({ data: dia, eventos: [ev] })
  }

  const totalPublicadas = paginas.filter(p => p.status === 'Publicada').length
  const totalAndamento = paginas.filter(p => p.status === 'Em andamento').length
  const totalImplementadas = paginas.filter(p => p.status === 'Implementada').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/funis" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-3">
          <ChevronLeft size={14} />
          Funis
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white">{funil.nome}</h1>
              {funil.id_funil && (
                <span className="text-indigo-400 font-mono text-sm bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  {funil.id_funil}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  color: funil.status === 'Ativo' ? '#22c55e' : '#6b7280',
                  borderColor: funil.status === 'Ativo' ? '#22c55e44' : '#6b728044',
                  backgroundColor: funil.status === 'Ativo' ? '#22c55e10' : '#6b728010',
                }}>
                {funil.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {especialistaNome && <span>{especialistaNome}</span>}
              {especialistaNome && produtoNome && <span className="mx-1.5 text-gray-700">·</span>}
              {produtoNome && <span>{produtoNome}</span>}
              <span className="mx-1.5 text-gray-700">·</span>
              <span>criado em {formatarData(funil.criado_em)}</span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{paginas.length}</p>
              <p className="text-gray-500 text-xs">páginas</p>
            </div>
            <div className="text-center">
              <p className="text-green-400 font-semibold text-lg">{totalPublicadas}</p>
              <p className="text-gray-500 text-xs">publicadas</p>
            </div>
            {totalAndamento > 0 && (
              <div className="text-center">
                <p className="text-indigo-400 font-semibold text-lg">{totalAndamento}</p>
                <p className="text-gray-500 text-xs">em andamento</p>
              </div>
            )}
            {totalImplementadas > 0 && (
              <div className="text-center">
                <p className="text-yellow-400 font-semibold text-lg">{totalImplementadas}</p>
                <p className="text-gray-500 text-xs">implementadas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-800">
        {([
          { id: 'timeline',    label: 'Timeline',    icon: Clock },
          { id: 'paginas',     label: 'Páginas',     icon: LayoutGrid },
          { id: 'estrategias', label: 'Estratégias', icon: Layers },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              aba === id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Aba Timeline */}
      {aba === 'timeline' && (
        <div>
          {eventos.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="space-y-0">
              {porData.map((grupo, gi) => (
                <div key={grupo.data} className="relative">
                  {/* Separador de data */}
                  <div className="flex items-center gap-3 py-3">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[11px] text-gray-600 font-medium uppercase tracking-wide shrink-0">
                      {new Date(grupo.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  {/* Eventos do dia */}
                  <div className="relative pl-6">
                    {/* Linha vertical */}
                    {(gi < porData.length - 1 || grupo.eventos.length > 1) && (
                      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-white/[0.08]" />
                    )}

                    {grupo.eventos.map((ev) => (
                      <div key={ev.id} className="relative flex items-start gap-4 py-2.5 group">
                        {/* Dot */}
                        <div
                          className="absolute left-[-25px] top-3 w-3.5 h-3.5 rounded-full border-2 border-gray-950 shrink-0 z-10"
                          style={{
                            backgroundColor: ev.tipo === 'funil'
                              ? '#6366f1'
                              : (STATUS_COR[ev.status ?? ''] ?? '#6b7280'),
                          }}
                        />

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-white text-sm font-medium">{ev.titulo}</span>
                            {ev.detalhe && ev.tipo === 'pagina' && (
                              <span className="text-xs"
                                style={{ color: STATUS_COR[ev.status ?? ''] ?? '#6b7280' }}>
                                {ev.detalhe}
                              </span>
                            )}
                            {ev.tipo === 'funil' && (
                              <span className="text-xs text-indigo-400">funil criado</span>
                            )}
                          </div>
                        </div>

                        {/* Hora */}
                        <span className="text-xs text-gray-700 shrink-0 mt-0.5">{formatarHora(ev.data)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aba Páginas */}
      {aba === 'paginas' && (
        <div className="space-y-4">
          {paginasProduto.length > 0 && (
            <div className="rounded-xl border border-indigo-500/20 overflow-hidden">
              <div className="px-4 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-2">
                <Layers size={13} className="text-indigo-400" />
                <span className="text-xs font-medium text-indigo-300">
                  Páginas do Produto{funil.produtos?.nome ? ` — ${funil.produtos.nome}` : ''}
                </span>
                <span className="text-xs text-indigo-500">· {paginasProduto.length} página{paginasProduto.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/[0.05]">
                  {paginasProduto.map(p => (
                    <tr key={p.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {p.codigo && (
                            <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">{p.codigo}</span>
                          )}
                          <span className="text-white text-sm">{p.nome}</span>
                          {p.url_pagina && (
                            <a href={p.url_pagina} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 shrink-0">
                              <LinkIcon size={11} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.etapa ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium" style={{ color: STATUS_COR[p.status] ?? '#6b7280' }}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <MapaPaginas
            paginas={paginas}
            funis={[funil] as never}
            especialistas={[]}
            configs={configs}
            estrategias={estrategiasState}
            produtos={[]}
            initialFunilId={funil.id}
          />
        </div>
      )}

      {/* Aba Estratégias */}
      {aba === 'estrategias' && (
        <div className="space-y-4">
          {erroEstrategia && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center justify-between">
              <span>{erroEstrategia}</span>
              <button onClick={() => setErroEstrategia(null)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {estrategiasState.length === 0
                ? 'Nenhuma estratégia cadastrada.'
                : `${estrategiasState.length} estratégia${estrategiasState.length !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={() => { setEditandoEstrategia(null); setModalEstrategiaAberto(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              <Plus size={14} />
              Nova estratégia
            </button>
          </div>

          {estrategiasState.length === 0 ? (
            <div className="border border-dashed border-gray-800 rounded-xl p-10 text-center">
              <Layers size={24} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Crie estratégias para organizar as páginas deste funil.</p>
              <p className="text-gray-600 text-xs mt-1">Ex: Captação Normal, Aplicação, VSL...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {estrategiasState.map(est => {
                const paginasDaEst = paginas.filter(p => (Object.hasOwn(estrategiaOverrides, p.id) ? estrategiaOverrides[p.id] : p.estrategia_id) === est.id)
                return (
                  <div key={est.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <Layers size={14} className="text-indigo-400 shrink-0" />
                        <span className="text-white font-medium text-sm">{est.nome}</span>
                        <span className="text-xs text-gray-600">{paginasDaEst.length} página{paginasDaEst.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {deletandoEstrategia === est.id ? (
                          <>
                            <button
                              disabled={deletandoConfirmado === est.id}
                              onClick={async () => {
                                setDeletandoConfirmado(est.id)
                                setErroEstrategia(null)
                                const resultado = await deletarEstrategia(est.id)
                                if (resultado.ok) {
                                  setEstrategiasState(prev => prev.filter(e => e.id !== est.id))
                                } else {
                                  setErroEstrategia(resultado.erro ?? 'Erro ao excluir estratégia.')
                                }
                                setDeletandoConfirmado(null)
                                setDeletandoEstrategia(null)
                              }}
                              className="px-2.5 py-1 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletandoConfirmado === est.id ? 'Excluindo...' : 'Confirmar'}
                            </button>
                            <button
                              disabled={deletandoConfirmado === est.id}
                              onClick={() => setDeletandoEstrategia(null)}
                              className="px-2.5 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditandoEstrategia(est); setModalEstrategiaAberto(true) }}
                              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeletandoEstrategia(est.id)}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                              title="Deletar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {paginasDaEst.length > 0 ? (
                      <div className="divide-y divide-white/[0.05]">
                        {paginasDaEst.map(p => (
                          <div key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                            {p.codigo && (
                              <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                                {p.codigo}
                              </span>
                            )}
                            <span className="text-sm text-gray-300">{p.nome}</span>
                            {p.etapa && <span className="text-xs text-gray-600">· {p.etapa}</span>}
                            {p.url_pagina && (
                              <a href={p.url_pagina} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 ml-auto shrink-0">
                                <LinkIcon size={11} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-xs text-gray-600">Nenhuma página associada a esta estratégia.</p>
                    )}
                  </div>
                )
              })}

              {/* Páginas sem estratégia */}
              {(() => {
                const semEst = paginas.filter(p => !(Object.hasOwn(estrategiaOverrides, p.id) ? estrategiaOverrides[p.id] : p.estrategia_id))
                if (semEst.length === 0) return null
                return (
                  <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <span className="text-xs text-gray-600">{semEst.length} página{semEst.length !== 1 ? 's' : ''} sem estratégia definida</span>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {semEst.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                          {p.codigo && (
                            <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                              {p.codigo}
                            </span>
                          )}
                          <span className="text-sm text-gray-500 flex-1 truncate">{p.nome}</span>
                          {p.etapa && <span className="text-xs text-gray-700 shrink-0">· {p.etapa}</span>}
                          {estrategiasState.length > 0 && (
                            <Select
                              onValueChange={async (v) => {
                                setAtribuindo(p.id)
                                try {
                                  await atualizarPagina(p.id, { estrategia_id: v })
                                  setEstategiaOverrides(prev => ({ ...prev, [p.id]: v }))
                                } finally {
                                  setAtribuindo(null)
                                }
                              }}
                            >
                              <SelectTrigger
                                disabled={atribuindo === p.id}
                                className="h-7 text-xs border-gray-700 bg-gray-900 text-gray-500 hover:text-white focus:ring-0 focus:ring-offset-0 w-36 shrink-0"
                              >
                                <SelectValue placeholder={atribuindo === p.id ? 'Salvando...' : 'Mover para...'} />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-800">
                                {estrategiasState.map(est => (
                                  <SelectItem key={est.id} value={est.id} className="text-gray-300 focus:bg-gray-800 focus:text-white text-xs">
                                    {est.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      <ModalEstrategia
        aberto={modalEstrategiaAberto}
        onFechar={() => { setModalEstrategiaAberto(false); setEditandoEstrategia(null) }}
        onSalvo={(salva) => {
          setEstrategiasState(prev => {
            const idx = prev.findIndex(e => e.id === salva.id)
            return idx >= 0 ? prev.map(e => e.id === salva.id ? salva : e) : [...prev, salva]
          })
          sessionStorage.setItem(TAB_KEY, 'estrategias')
          setAba('estrategias')
        }}
        funilId={funil.id}
        estrategia={editandoEstrategia}
      />
    </div>
  )
}
