'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, FileText, ExternalLink, AlertCircle, Copy, Trash2, Check, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalFunil } from './ModalFunil'
import { ModalDuplicarFunil } from './ModalDuplicarFunil'
import { ModalPagina } from '@/components/paginas/ModalPagina'
import { deletarFunil, atualizarFunil } from '@/lib/actions/funis'
import type { Funil, Produto, Especialista, Configuracao } from '@/lib/types'

type EtapaHealth = 'publicada' | 'implementada' | 'andamento' | 'fazer' | 'atrasada' | 'pausada'

const HEALTH_CONFIG: Record<EtapaHealth, { cor: string; label: string }> = {
  publicada:    { cor: '#22c55e', label: 'Publicada' },
  implementada: { cor: '#eab308', label: 'Implementada' },
  andamento:    { cor: '#3b82f6', label: 'Em andamento' },
  fazer:        { cor: '#6b7280', label: 'A fazer' },
  atrasada:     { cor: '#ef4444', label: 'Atrasada' },
  pausada:      { cor: '#f97316', label: 'Pausada' },
}

interface FunilComMetricas extends Funil {
  total_paginas: number
  paginas_publicadas: number
  impl_nao_publicadas: number
  etapas_pipeline: { etapa: string; health: EtapaHealth }[]
}

interface Props {
  funis: FunilComMetricas[]
  initialEspecialistaId?: string
  produtos: Produto[]
  especialistas: Especialista[]
  configs: Configuracao[]
}

export function ListaFunis({ funis, produtos, especialistas, configs, initialEspecialistaId }: Props) {
  const router = useRouter()
  const [filtroEsp, setFiltroEsp] = useState(initialEspecialistaId ?? '')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Funil | null>(null)
  const [duplicando, setDuplicando] = useState<Funil | null>(null)
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null)
  const [erroDelete, setErroDelete] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [novaPaginaFunilId, setNovaPaginaFunilId] = useState<string | null>(null)

  const colorMap = configs.reduce((acc, c) => ({ ...acc, [`${c.categoria}:${c.valor}`]: c.cor }), {} as Record<string, string | null | undefined>)
  const cor = (cat: string, val: string) => colorMap[`${cat}:${val}`] ?? null

  const filtrados = funis.filter(f => {
    const prod = produtos.find(p => p.id === f.produto_id)
    if (filtroEsp && prod?.especialista_id !== filtroEsp) return false
    if (filtroStatus && f.status !== filtroStatus) return false
    return true
  })

  const statusOpts = configs.filter(c => c.categoria === 'status_funil' && c.ativo)

  async function handleMudarStatusFunil(id: string, novoStatus: string) {
    setStatusOverrides(o => ({ ...o, [id]: novoStatus }))
    await atualizarFunil(id, { status: novoStatus })
  }

  async function handleDeletar(id: string) {
    setErroDelete(null)
    try {
      await deletarFunil(id)
      setConfirmandoDelete(null)
      router.refresh()
    } catch (e: unknown) {
      setErroDelete(e instanceof Error ? e.message : 'Erro ao excluir funil.')
      setConfirmandoDelete(null)
    }
  }

  function pctPublicadas(f: FunilComMetricas) {
    if (!f.total_paginas) return 0
    return Math.round((f.paginas_publicadas / f.total_paginas) * 100)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Funis</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtrados.length} funil{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true) }} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
          <Plus size={16} /> Novo Funil
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select value={filtroEsp} onChange={e => setFiltroEsp(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500 h-9">
          <option value="">Todos os especialistas</option>
          {especialistas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500 h-9">
          <option value="">Todos os status</option>
          {statusOpts.map(c => <option key={c.valor} value={c.valor}>{c.valor}</option>)}
        </select>
        {(filtroEsp || filtroStatus) && (
          <button onClick={() => { setFiltroEsp(''); setFiltroStatus('') }}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:border-gray-500 transition-colors">
            Limpar
          </button>
        )}
      </div>

      {erroDelete && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start justify-between gap-2">
          <span>{erroDelete}</span>
          <button onClick={() => setErroDelete(null)} className="shrink-0 text-red-400 hover:text-red-300"><X size={14} /></button>
        </div>
      )}

      {/* Cards */}
      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-gray-600 p-12 text-center text-gray-500">
          {funis.length === 0 ? 'Nenhum funil cadastrado ainda.' : 'Nenhum funil encontrado com os filtros aplicados.'}
        </div>
      ) : (() => {
        const renderCard = (f: FunilComMetricas) => {
            const prod = produtos.find(p => p.id === f.produto_id)
            const esp = especialistas.find(e => e.id === prod?.especialista_id)
            const pct = pctPublicadas(f)
            const temImpl = f.impl_nao_publicadas > 0

            return (
              <div key={f.id} className="bg-gray-900 border border-gray-600 rounded-xl p-4 space-y-3 hover:border-gray-500 transition-colors">
                {/* Header do card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {f.id_funil && (
                        <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                          {f.id_funil}
                        </span>
                      )}
                      <span className="text-white font-semibold truncate">{f.nome}</span>
                    </div>
                    {(esp || prod) && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {[esp?.nome, prod?.nome].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {(() => {
                    const statusAtual = statusOverrides[f.id] ?? f.status
                    const corAtual = cor('status_funil', statusAtual)
                    return (
                      <select
                        value={statusAtual}
                        onChange={e => handleMudarStatusFunil(f.id, e.target.value)}
                        className="appearance-none text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none bg-transparent"
                        style={{
                          color: corAtual ?? '#6b7280',
                          borderColor: corAtual ? `${corAtual}4d` : '#374151',
                          backgroundColor: corAtual ? `${corAtual}1a` : 'transparent',
                        }}
                      >
                        {statusOpts.map(c => (
                          <option key={c.valor} value={c.valor}>{c.valor}</option>
                        ))}
                      </select>
                    )
                  })()}
                </div>

                {/* Tipo */}
                <div className="flex items-center gap-2">
                  <StatusBadge valor={f.tipo} cor={null} size="sm" />
                  {f.planilha_leads && (
                    <a href={f.planilha_leads} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <ExternalLink size={10} /> Leads
                    </a>
                  )}
                </div>

                {/* Pipeline de etapas */}
                {f.etapas_pipeline?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {f.etapas_pipeline.map(({ etapa, health }, i) => {
                      const cfg = HEALTH_CONFIG[health]
                      return (
                        <div key={etapa} className="flex items-center gap-1">
                          {i > 0 && <span className="text-gray-700 text-xs">›</span>}
                          <div className="flex items-center gap-1" title={cfg.label}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.cor }} />
                            <span className="text-xs" style={{ color: cfg.cor }}>{etapa}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Métricas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{f.paginas_publicadas} de {f.total_paginas} páginas publicadas</span>
                    <span className="text-gray-400 font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct === 100 ? '#22c55e' : pct > 50 ? '#f97316' : '#3b82f6'
                      }}
                    />
                  </div>
                  {temImpl && (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                      <AlertCircle size={11} />
                      <span>{f.impl_nao_publicadas} implementada{f.impl_nao_publicadas !== 1 ? 's' : ''} aguardando publicação</span>
                    </div>
                  )}
                </div>

                {/* Responsáveis */}
                {(f.responsavel_cro || f.responsavel_dev) && (
                  <div className="flex gap-3 text-xs text-gray-500">
                    {f.responsavel_cro && <span>CRO: <span className="text-gray-400">{f.responsavel_cro}</span></span>}
                    {f.responsavel_dev && <span>Dev: <span className="text-gray-400">{f.responsavel_dev}</span></span>}
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-600">
                  {confirmandoDelete === f.id ? (
                    <>
                      <span className="flex-1 text-xs text-gray-400">Excluir funil?</span>
                      <button
                        onClick={() => handleDeletar(f.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 py-1.5 px-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Check size={12} /> Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmandoDelete(null)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X size={12} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setNovaPaginaFunilId(f.id)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 py-1.5 px-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Plus size={12} />
                        Página
                      </button>
                      <Link
                        href={`/paginas?funil=${f.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <FileText size={12} />
                        Ver ({f.total_paginas})
                      </Link>
                      <button
                        onClick={() => setDuplicando(f)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Copy size={12} />
                        Duplicar
                      </button>
                      <button
                        onClick={() => { setEditando(f); setModalAberto(true) }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => { setConfirmandoDelete(f.id); setErroDelete(null) }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 py-1.5 px-2 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Excluir funil"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
        }

        const GRUPOS = [
          {
            label: 'Evergreen',
            tipos: ['Evergreen'],
            cor: 'text-green-400',
            linha: 'bg-green-900/30',
          },
          {
            label: 'Launch',
            tipos: ['Lançamento', 'Webinar', 'Evento'],
            cor: 'text-indigo-400',
            linha: 'bg-indigo-900/30',
          },
          {
            label: 'Ongoing',
            tipos: [] as string[], // catch-all
            cor: 'text-gray-400',
            linha: 'bg-gray-800',
          },
        ]

        const atribuirGrupo = (f: FunilComMetricas) => {
          for (const g of GRUPOS.slice(0, -1)) {
            if (g.tipos.includes(f.tipo)) return g.label
          }
          return 'Ongoing'
        }

        return (
          <div className="space-y-8">
            {GRUPOS.map(grupo => {
              const itens = filtrados.filter(f => atribuirGrupo(f) === grupo.label)
              if (!itens.length) return null
              return (
                <div key={grupo.label} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold uppercase tracking-widest ${grupo.cor}`}>
                      {grupo.label}
                    </span>
                    <div className={`flex-1 h-px ${grupo.linha}`} />
                    <span className="text-xs text-gray-600">{itens.length} funil{itens.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {itens.map(renderCard)}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      <ModalPagina
        aberto={novaPaginaFunilId !== null}
        onFechar={() => setNovaPaginaFunilId(null)}
        onSalvo={() => { router.refresh(); setNovaPaginaFunilId(null) }}
        funis={funis}
        configs={configs}
        funilPreSelecionado={novaPaginaFunilId ?? undefined}
      />

      <ModalFunil
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setEditando(null) }}
        onSalvo={() => router.refresh()}
        funil={editando}
        produtos={produtos}
        especialistas={especialistas}
        configs={configs}
      />

      <ModalDuplicarFunil
        aberto={duplicando !== null}
        onFechar={() => setDuplicando(null)}
        onSalvo={() => router.refresh()}
        funil={duplicando}
        produtos={produtos}
        especialistas={especialistas}
      />
    </div>
  )
}
