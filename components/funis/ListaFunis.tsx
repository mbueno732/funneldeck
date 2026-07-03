'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, FileText, ExternalLink, AlertCircle, Copy, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalFunil } from './ModalFunil'
import { ModalDuplicarFunil } from './ModalDuplicarFunil'
import { ModalPagina } from '@/components/paginas/ModalPagina'
import { deletarFunil, atualizarFunil } from '@/lib/actions/funis'
import type { Funil, Produto, Especialista, Configuracao, Estrategia } from '@/lib/types'

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
  tem_movimento?: boolean
  total_paginas: number
  paginas_publicadas: number
  impl_nao_publicadas: number
  etapas_pipeline: { etapa: string; health: EtapaHealth }[]
}

interface Props {
  funis: FunilComMetricas[]
  initialEspecialistaId?: string
  initialProdutoId?: string
  initialParados?: boolean
  produtos: Produto[]
  especialistas: Especialista[]
  configs: Configuracao[]
  estrategias: Estrategia[]
}

export function ListaFunis({ funis, produtos, especialistas, configs, estrategias, initialEspecialistaId, initialProdutoId, initialParados }: Props) {
  const router = useRouter()
  const [filtroEsp, setFiltroEsp] = useState(initialEspecialistaId ?? '')
  const [filtroProduto, setFiltroProduto] = useState(initialProdutoId ?? '')
  const [apenasParados, setApenasParados] = useState(initialParados ?? false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Funil | null>(null)
  const [duplicando, setDuplicando] = useState<Funil | null>(null)
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null)
  const [erroDelete, setErroDelete] = useState<string | null>(null)
  const [deletados, setDeletados] = useState<Set<string>>(new Set())
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [novaPaginaFunilId, setNovaPaginaFunilId] = useState<string | null>(null)
  const [encerradosAbertos, setEncerradosAbertos] = useState(false)

  const colorMap = configs.reduce((acc, c) => ({ ...acc, [`${c.categoria}:${c.valor}`]: c.cor }), {} as Record<string, string | null | undefined>)
  const cor = (cat: string, val: string) => colorMap[`${cat}:${val}`] ?? null

  const filtrados = funis.filter(f => {
    if (deletados.has(f.id)) return false
    const prod = produtos.find(p => p.id === f.produto_id)
    if (filtroEsp && prod?.especialista_id !== filtroEsp) return false
    if (filtroProduto && f.produto_id !== filtroProduto) return false
    if (filtroStatus && f.status !== filtroStatus) return false
    if (apenasParados && (f.tem_movimento || (statusOverrides[f.id] ?? f.status) !== 'Ativo')) return false
    return true
  })

  const statusOpts = configs.filter(c => c.categoria === 'status_funil' && c.ativo)

  async function handleMudarStatusFunil(id: string, novoStatus: string) {
    setStatusOverrides(o => ({ ...o, [id]: novoStatus }))
    await atualizarFunil(id, { status: novoStatus })
  }

  async function handleDeletar(id: string) {
    setErroDelete(null)
    setDeletados(d => new Set(d).add(id))
    setConfirmandoDelete(null)
    try {
      await deletarFunil(id)
    } catch (e: unknown) {
      setDeletados(d => { const next = new Set(d); next.delete(id); return next })
      setErroDelete(e instanceof Error ? e.message : 'Erro ao excluir funil.')
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
        <Button onClick={() => { setEditando(null); setModalAberto(true) }} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
          <Plus size={16} /> Novo Funil
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filtroEsp || '__all__'} onValueChange={v => setFiltroEsp(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            <SelectItem value="__all__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Todos os especialistas</SelectItem>
            {especialistas.map(e => <SelectItem key={e.id} value={e.id} className="text-gray-300 focus:bg-gray-800 focus:text-white">{e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroProduto || '__all__'} onValueChange={v => setFiltroProduto(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            <SelectItem value="__all__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Todos os produtos</SelectItem>
            {produtos.map(p => <SelectItem key={p.id} value={p.id} className="text-gray-300 focus:bg-gray-800 focus:text-white">{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus || '__all__'} onValueChange={v => setFiltroStatus(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 focus:ring-0 focus:ring-offset-0 w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            <SelectItem value="__all__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Todos os status</SelectItem>
            {statusOpts.map(c => <SelectItem key={c.valor} value={c.valor} className="text-gray-300 focus:bg-gray-800 focus:text-white">{c.valor}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filtroEsp || filtroProduto || filtroStatus) && (
          <button onClick={() => { setFiltroEsp(''); setFiltroProduto(''); setFiltroStatus('') }}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-800 rounded-lg hover:border-gray-600 transition-colors">
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

      {apenasParados && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm text-orange-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            Exibindo apenas funis ativos sem páginas em andamento, implementadas ou publicadas.
          </div>
          <button onClick={() => setApenasParados(false)} className="shrink-0 hover:text-orange-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Cards */}
      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-12 text-center text-gray-500">
          {funis.length === 0 ? 'Nenhum funil cadastrado ainda.' : 'Nenhum funil encontrado com os filtros aplicados.'}
        </div>
      ) : (() => {
        const renderCard = (f: FunilComMetricas) => {
            const prod = produtos.find(p => p.id === f.produto_id)
            const esp = especialistas.find(e => e.id === prod?.especialista_id)
            const pct = pctPublicadas(f)
            const temImpl = f.impl_nao_publicadas > 0
            const inativo = (statusOverrides[f.id] ?? f.status) === 'Inativo'
            const parado = !inativo && (statusOverrides[f.id] ?? f.status) === 'Ativo' && !f.tem_movimento

            return (
              <div key={f.id} className={`bg-gray-900 rounded-xl p-4 space-y-3 transition-colors ${inativo ? 'border border-gray-800 opacity-50 hover:opacity-75' : parado ? 'border border-orange-500/40 hover:border-orange-500/60' : 'border border-gray-800 hover:border-gray-600'}`}>
                {/* Header do card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {f.id_funil && (
                        <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                          {f.id_funil}
                        </span>
                      )}
                      <Link href={`/funis/${f.id}`} className="text-white font-semibold truncate hover:text-indigo-300 transition-colors">{f.nome}</Link>
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
                      <Select value={statusAtual} onValueChange={v => handleMudarStatusFunil(f.id, v)}>
                        <SelectTrigger
                          className="border-0 bg-transparent p-0 h-auto w-auto text-xs font-medium focus:ring-0 focus:ring-offset-0 gap-0 [&>svg]:hidden px-2 py-0.5 rounded-full border cursor-pointer"
                          style={{
                            color: corAtual ?? '#6b7280',
                            borderColor: corAtual ? `${corAtual}4d` : '#374151',
                            backgroundColor: corAtual ? `${corAtual}1a` : 'transparent',
                            border: `1px solid ${corAtual ? `${corAtual}4d` : '#374151'}`,
                          }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                          {statusOpts.map(c => (
                            <SelectItem key={c.valor} value={c.valor} className="text-gray-300 focus:bg-gray-800 focus:text-white">{c.valor}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  })()}
                </div>

                {/* Tipo + Objetivo */}
                <div className="flex items-center gap-2">
                  <StatusBadge valor={f.tipo} cor={null} size="sm" />
                  {f.objetivo && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      f.objetivo === 'Venda'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {f.objetivo}
                    </span>
                  )}

                  {f.planilha_leads && (
                    <a href={f.planilha_leads} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <ExternalLink size={10} /> Leads
                    </a>
                  )}
                  {f.planilha_pesquisa && (
                    <a href={f.planilha_pesquisa} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <ExternalLink size={10} /> Pesquisa
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
                  <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
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
                <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                  {confirmandoDelete === f.id ? (
                    <>
                      <span className="flex-1 text-xs text-gray-400">Excluir funil?</span>
                      <button
                        onClick={() => handleDeletar(f.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <Check size={12} /> Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmandoDelete(null)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <X size={12} /> Cancelar
                      </button>
                    </>
                  ) : inativo ? (
                    <>
                      <Link
                        href={`/paginas?funil=${f.id}`}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <FileText size={12} />
                        Ver histórico
                      </Link>
                      <button
                        onClick={() => { setEditando(f); setModalAberto(true) }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setNovaPaginaFunilId(f.id)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <Plus size={12} />
                        Página
                      </button>
                      <Link
                        href={`/paginas?funil=${f.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <FileText size={12} />
                        Ver ({f.total_paginas})
                      </Link>
                      <button
                        onClick={() => setDuplicando(f)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <Copy size={12} />
                        Duplicar
                      </button>
                      <button
                        onClick={() => { setEditando(f); setModalAberto(true) }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => { setConfirmandoDelete(f.id); setErroDelete(null) }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 py-1.5 px-2 hover:bg-gray-900 rounded-lg transition-colors"
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
            label: 'Launch',
            tipos: ['Lançamento', 'Webinar', 'Evento'],
            badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            linha: 'bg-gradient-to-r from-amber-500/40 to-transparent',
            contador: 'text-amber-500/50',
          },
          {
            label: 'Evergreen',
            tipos: ['Evergreen'],
            badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            linha: 'bg-gradient-to-r from-emerald-500/40 to-transparent',
            contador: 'text-emerald-500/50',
          },
          {
            label: 'Ongoing',
            tipos: ['Ongoing'],
            badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
            linha: 'bg-gradient-to-r from-sky-500/40 to-transparent',
            contador: 'text-sky-500/50',
          },
          {
            label: 'Plataforma',
            tipos: ['Plataforma'],
            badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
            linha: 'bg-gradient-to-r from-violet-500/40 to-transparent',
            contador: 'text-violet-500/50',
          },
        ]

        const atribuirGrupo = (f: FunilComMetricas) => {
          for (const g of GRUPOS) {
            if (g.tipos.includes(f.tipo)) return g.label
          }
          return 'Ongoing'
        }

        const ativos = filtrados.filter(f => (statusOverrides[f.id] ?? f.status) !== 'Inativo')
        const inativos = filtrados.filter(f => (statusOverrides[f.id] ?? f.status) === 'Inativo')

        return (
          <div className="space-y-10">
            {GRUPOS.map(grupo => {
              const itens = ativos.filter(f => atribuirGrupo(f) === grupo.label)
              if (!itens.length) return null
              return (
                <div key={grupo.label} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest rounded-full border ${grupo.badge}`}>
                      {grupo.label}
                    </span>
                    <div className={`flex-1 h-px ${grupo.linha}`} />
                    <span className={`text-xs font-medium ${grupo.contador}`}>
                      {itens.length} funil{itens.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {itens.map(renderCard)}
                  </div>
                </div>
              )
            })}

            {inativos.length > 0 && (
              <div className="space-y-4">
                <button
                  onClick={() => setEncerradosAbertos(v => !v)}
                  className="flex items-center gap-3 w-full group"
                >
                  <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest rounded-full border bg-gray-800/50 text-gray-500 border-gray-700">
                    Encerrados
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-700/60 to-transparent" />
                  <span className="text-xs font-medium text-gray-700">
                    {inativos.length} funil{inativos.length !== 1 ? 's' : ''}
                  </span>
                  {encerradosAbertos
                    ? <ChevronDown size={14} className="text-gray-600" />
                    : <ChevronRight size={14} className="text-gray-600" />
                  }
                </button>
                {encerradosAbertos && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {inativos.map(renderCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      <ModalPagina
        aberto={novaPaginaFunilId !== null}
        onFechar={() => setNovaPaginaFunilId(null)}
        onSalvo={() => { router.refresh(); setNovaPaginaFunilId(null) }}
        funis={funis}
        configs={configs}
        estrategias={estrategias}
        produtos={[]}
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
