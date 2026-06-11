'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ExternalLink, Pencil, Trash2, AlertTriangle, Clock, Copy, Link as LinkIcon, Check, X, ChevronRight, ChevronDown, ClipboardList, LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalPagina } from './ModalPagina'
import { PainelChecklist } from './PainelChecklist'
import { atualizarPagina, deletarPagina, duplicarPagina } from '@/lib/actions/paginas'
import { iniciarAnaliseGtmetrix, verificarAnaliseGtmetrix } from '@/lib/actions/gtmetrix'
import type { Pagina, Funil, Especialista, Configuracao } from '@/lib/types'

interface Props {
  paginas: Pagina[]
  funis: Funil[]
  especialistas: Especialista[]
  configs: Configuracao[]
  initialFunilId?: string
  initialStatus?: string
  initialAtrasadas?: boolean
}

export function MapaPaginas({ paginas, funis, configs, initialFunilId, initialStatus, initialAtrasadas }: Props) {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Record<string, Partial<Pagina>>>({})
  const [editandoUrl, setEditandoUrl] = useState<string | null>(null)
  const [urlTemp, setUrlTemp] = useState('')
  const [celula, setCelula] = useState<{ id: string; campo: 'horas_reais' | 'data_prevista' | 'codigo'; valor: string } | null>(null)
  const [deletandoPagina, setDeletandoPagina] = useState<string | null>(null)
  const [analisando, setAnalisando] = useState<string | null>(null)
  const [estadoGtmetrix, setEstadoGtmetrix] = useState<string>('')
  const [progressoGtmetrix, setProgressoGtmetrix] = useState(0)
  const [erroGtmetrix, setErroGtmetrix] = useState<string | null>(null)
  const [expandidoGtmetrix, setExpandidoGtmetrix] = useState<string | null>(null)
  const progressoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (analisando) {
      setProgressoGtmetrix(0)
      progressoRef.current = setInterval(() => {
        setProgressoGtmetrix(prev => {
          if (prev >= 90) return prev
          return prev + (90 - prev) * 0.04
        })
      }, 800)
    } else {
      if (progressoRef.current) clearInterval(progressoRef.current)
      setProgressoGtmetrix(prev => prev > 0 ? 100 : 0)
      setTimeout(() => setProgressoGtmetrix(0), 600)
    }
    return () => { if (progressoRef.current) clearInterval(progressoRef.current) }
  }, [analisando])
  const [busca, setBusca] = useState('')
  const [filtroFunil, setFiltroFunil] = useState(initialFunilId ?? '')
  const [filtroStatus, setFiltroStatus] = useState(initialStatus ?? '')
  const [filtroAtrasadas, setFiltroAtrasadas] = useState(initialAtrasadas ?? false)
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [filtroPrioridade, setFiltroPrioridade] = useState('')
  const [filtroFerramenta, setFiltroFerramenta] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Pagina | null>(null)
  const [checklistPagina, setChecklistPagina] = useState<Pagina | null>(null)
  const [distribuicaoAberta, setDistribuicaoAberta] = useState(true)
  const [visualizacao, setVisualizacao] = useState<'tabela' | 'kanban'>('tabela')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  const hoje = useMemo(() => new Date().toISOString().split('T')[0], [])

  const colorMap = useMemo(() =>
    configs.reduce((acc, c) => ({ ...acc, [`${c.categoria}:${c.valor}`]: c.cor }), {} as Record<string, string | null | undefined>)
  , [configs])

  const cor = (cat: string, val: string) => colorMap[`${cat}:${val}`] ?? null

  const configOpts = (cat: string) => configs.filter(c => c.categoria === cat && c.ativo)

  const distribuicaoFerramenta = useMemo(() => {
    const total = paginas.length
    if (!total) return []
    const mapa: Record<string, number> = {}
    paginas.forEach(p => {
      const chave = p.ferramenta ?? '__sem__'
      mapa[chave] = (mapa[chave] ?? 0) + 1
    })
    return Object.entries(mapa)
      .map(([ferramenta, count]) => ({
        ferramenta,
        label: ferramenta === '__sem__' ? 'Sem ferramenta' : ferramenta,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [paginas])

  const filtradas = useMemo(() => (paginas ?? []).filter(p => {
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroFunil && p.funil_id !== filtroFunil) return false
    if (filtroStatus && p.status !== filtroStatus) return false
    if (filtroEtapa && p.etapa !== filtroEtapa) return false
    if (filtroPrioridade && p.prioridade !== filtroPrioridade) return false
    if (filtroFerramenta && p.ferramenta !== filtroFerramenta) return false
    if (filtroAtrasadas && !isAtrasada(p)) return false
    return true
  }), [paginas, busca, filtroFunil, filtroStatus, filtroEtapa, filtroPrioridade, filtroFerramenta, filtroAtrasadas])

  const isAtrasada = (p: Pagina) =>
    p.data_prevista && p.data_prevista < hoje && !['Publicada', 'Suspensa'].includes(p.status)

  const isDesvioHoras = (p: Pagina) =>
    p.horas_estimadas && p.horas_reais && p.horas_reais > p.horas_estimadas


  async function handleMudarStatus(pagina: Pagina, novoStatus: string) {
    setOverrides(o => ({ ...o, [pagina.id]: { ...o[pagina.id], status: novoStatus } }))
    await atualizarPagina(pagina.id, { status: novoStatus })
  }

  async function handleSalvarUrl(pagina: Pagina) {
    const url = urlTemp.trim() || null
    setOverrides(o => ({ ...o, [pagina.id]: { ...o[pagina.id], url_pagina: url } }))
    setEditandoUrl(null)
    await atualizarPagina(pagina.id, { url_pagina: url })
  }

  async function handleMudarPrioridade(pagina: Pagina, novaPrioridade: string) {
    setOverrides(o => ({ ...o, [pagina.id]: { ...o[pagina.id], prioridade: novaPrioridade || null } }))
    await atualizarPagina(pagina.id, { prioridade: novaPrioridade || null })
  }

  async function handleSalvarCelula() {
    if (!celula) return
    const { id, campo, valor } = celula
    const update: Partial<Pagina> =
      campo === 'horas_reais' ? { horas_reais: valor ? parseFloat(valor) : null } :
      campo === 'data_prevista' ? { data_prevista: valor || null } :
      { codigo: valor.trim() || null }
    setOverrides(o => ({ ...o, [id]: { ...o[id], ...update } }))
    setCelula(null)
    await atualizarPagina(id, update)
  }

  async function handleAnalisarGtmetrix(p: Pagina) {
    if (!p.url_pagina) return
    setAnalisando(p.id)
    setEstadoGtmetrix('Iniciando...')
    setErroGtmetrix(null)
    try {
      const testeId = await iniciarAnaliseGtmetrix(p.url_pagina)
      setEstadoGtmetrix('Na fila')

      // Poll a cada 7s por até 5 minutos (42 tentativas)
      let tentativas = 0
      const poll = async (): Promise<void> => {
        tentativas++
        if (tentativas > 42) throw new Error('Análise demorou mais que 5 minutos. Tente novamente.')
        await new Promise(r => setTimeout(r, 7000))
        const resultado = await verificarAnaliseGtmetrix(testeId, p.id)
        if (resultado.estado === 'pendente') {
          const estado = resultado.estadoRaw ?? 'pendente'
          setEstadoGtmetrix(estado === 'started' ? 'Processando' : 'Na fila')
          return poll()
        }
        if (resultado.estado === 'erro') throw new Error(`GTmetrix erro: ${resultado.estadoRaw ?? 'sem detalhes'}`)
        setOverrides(o => ({
          ...o,
          [p.id]: {
            ...o[p.id],
            gtmetrix_grade: resultado.grade,
            gtmetrix_score: resultado.score,
            gtmetrix_lcp: resultado.lcp,
            gtmetrix_tempo: resultado.tempo,
          }
        }))
      }
      await poll()
    } catch (e: unknown) {
      setErroGtmetrix(e instanceof Error ? e.message : 'Erro ao analisar no GTmetrix.')
    } finally {
      setAnalisando(null)
      setEstadoGtmetrix('')
    }
  }

  async function handleDuplicar(id: string) {
    await duplicarPagina(id)
    router.refresh()
  }

  async function handleDeletar(id: string) {
    await deletarPagina(id)
    setDeletandoPagina(null)
    router.refresh()
  }

  function handleSalvo() {
    router.refresh()
  }

  const filtroSelect = (label: string, value: string, onChange: (v: string) => void, cat: string) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500 h-9"
    >
      <option value="">{label}</option>
      {configOpts(cat).map(c => <option key={c.valor} value={c.valor}>{c.valor}</option>)}
    </select>
  )

  const totalAtrasadas = filtradas.filter(isAtrasada).length

  return (
    <div className="space-y-4">
      {/* Breadcrumb quando filtrado por funil */}
      {filtroFunil && (() => {
        const funilAtivo = funis.find(f => f.id === filtroFunil)
        return funilAtivo ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Link href="/funis" className="text-gray-500 hover:text-white transition-colors">Funis</Link>
            <ChevronRight size={14} className="text-gray-700" />
            <span className="text-white font-medium">{funilAtivo.nome}</span>
            <button
              onClick={() => setFiltroFunil('')}
              className="ml-1 text-gray-600 hover:text-gray-400 transition-colors"
              title="Ver todas as páginas"
            >
              <X size={13} />
            </button>
          </div>
        ) : null
      })()}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa de Páginas</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtradas.length} página{filtradas.length !== 1 ? 's' : ''}
            {totalAtrasadas > 0 && (
              <span className="ml-2 text-red-400 font-medium">· {totalAtrasadas} atrasada{totalAtrasadas !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-900 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setVisualizacao('tabela')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${visualizacao === 'tabela' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Visão tabela"
            >
              <List size={14} />
              Tabela
            </button>
            <button
              onClick={() => setVisualizacao('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${visualizacao === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Visão kanban"
            >
              <LayoutGrid size={14} />
              Kanban
            </button>
          </div>
          <Button
            onClick={() => { setEditando(null); setModalAberto(true) }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            title={filtroFunil ? `Nova página no funil selecionado` : undefined}
          >
            <Plus size={16} />
            Nova Página
          </Button>
        </div>
      </div>

      {erroGtmetrix && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start justify-between gap-2">
          <span>{erroGtmetrix}</span>
          <button onClick={() => setErroGtmetrix(null)} className="shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Distribuição por ferramenta */}
      {distribuicaoFerramenta.length > 0 && (
        <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setDistribuicaoAberta(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span className="font-medium text-white">Distribuição por ferramenta</span>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-xs">{paginas.length} páginas no total</span>
              {distribuicaoAberta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </button>
          {distribuicaoAberta && (
            <div className="px-4 pb-4 space-y-2.5 border-t border-white/10 pt-3">
              {distribuicaoFerramenta.map(({ ferramenta, label, count, pct }) => (
                <button
                  key={ferramenta}
                  onClick={() => setFiltroFerramenta(filtroFerramenta === ferramenta && ferramenta !== '__sem__' ? '' : ferramenta === '__sem__' ? '' : ferramenta)}
                  className={`w-full group text-left transition-opacity ${filtroFerramenta && filtroFerramenta !== ferramenta ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${ferramenta === '__sem__' ? 'text-gray-500' : 'text-gray-300 group-hover:text-white'}`}>
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{count} pág.</span>
                      <span className="text-xs font-medium text-gray-400 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: ferramenta === '__sem__' ? '#4b5563' : '#6366f1',
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscar páginas..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-8 bg-gray-900 border-white/10 text-white placeholder-gray-500 h-9 w-52"
          />
        </div>
        <select
          value={filtroFunil}
          onChange={e => setFiltroFunil(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500 h-9"
        >
          <option value="">Todos os funis</option>
          {funis.map(f => (
            <option key={f.id} value={f.id}>
              {f.id_funil ? `[${f.id_funil}] ` : ''}{f.nome}
            </option>
          ))}
        </select>
        {filtroSelect('Etapa', filtroEtapa, setFiltroEtapa, 'etapa')}
        {filtroSelect('Status', filtroStatus, setFiltroStatus, 'status_pagina')}
        {filtroSelect('Prioridade', filtroPrioridade, setFiltroPrioridade, 'prioridade')}
        {filtroSelect('Ferramenta', filtroFerramenta, setFiltroFerramenta, 'ferramenta')}

        {filtroAtrasadas && (
          <button
            onClick={() => setFiltroAtrasadas(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/40 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Atrasadas <X size={12} />
          </button>
        )}
        {(busca || filtroFunil || filtroStatus || filtroEtapa || filtroPrioridade || filtroFerramenta || filtroAtrasadas) && (
          <button
            onClick={() => { setBusca(''); setFiltroFunil(''); setFiltroStatus(''); setFiltroEtapa(''); setFiltroPrioridade(''); setFiltroFerramenta(''); setFiltroAtrasadas(false) }}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg hover:border-white/20 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Kanban */}
      {visualizacao === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {configOpts('status_pagina').map(col => {
            const colPaginas = filtradas.filter(raw => ({ ...raw, ...overrides[raw.id] }).status === col.valor)
            return (
              <div
                key={col.valor}
                className={`flex-none w-72 rounded-xl border transition-colors ${
                  dragOverStatus === col.valor
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-white/10 bg-gray-900/50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOverStatus(col.valor) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null) }}
                onDrop={async e => {
                  e.preventDefault()
                  setDragOverStatus(null)
                  if (draggingId) {
                    const pagina = paginas.find(p => p.id === draggingId)
                    if (pagina && ({ ...pagina, ...overrides[pagina.id] }).status !== col.valor) {
                      await handleMudarStatus(pagina, col.valor)
                    }
                  }
                  setDraggingId(null)
                }}
              >
                {/* Cabeçalho da coluna */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    {col.cor && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.cor }} />}
                    <span className="text-sm font-medium text-white">{col.valor}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full">{colPaginas.length}</span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-24">
                  {colPaginas.map(raw => {
                    const p = { ...raw, ...overrides[raw.id] }
                    const atrasada = isAtrasada(p)
                    const rawCl = (p as Record<string, unknown>).checklists_publicacao
                    const cl = Array.isArray(rawCl) ? rawCl[0] : rawCl as { checklist_itens: { concluido: boolean }[] } | null
                    const itens = cl?.checklist_itens ?? []
                    const total = itens.length
                    const done = itens.filter((i: { concluido: boolean }) => i.concluido).length
                    const pct = total > 0 ? Math.round((done / total) * 100) : null

                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDraggingId(p.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                        className={`group bg-gray-900 border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
                          draggingId === p.id
                            ? 'opacity-40 border-indigo-500'
                            : atrasada
                              ? 'border-l-2 border-l-red-500 border-white/10 hover:border-white/20'
                              : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Topo do card */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 flex-wrap min-w-0 flex-1">
                            {p.codigo && (
                              <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                                {p.codigo}
                              </span>
                            )}
                            <span className="text-sm text-white font-medium leading-snug break-words">{p.nome}</span>
                            {p.url_pagina && (
                              <a href={p.url_pagina} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 shrink-0 mt-0.5">
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {['Implementada', 'Publicada'].includes(p.status) && (
                              <button
                                onClick={() => setChecklistPagina(raw)}
                                className="p-1 hover:bg-gray-900 rounded transition-colors"
                                title="Checklist"
                              >
                                <ClipboardList size={12} className={pct === 100 ? 'text-green-400' : pct !== null ? 'text-yellow-400' : 'text-indigo-400'} />
                              </button>
                            )}
                            <button
                              onClick={() => { setEditando(raw); setModalAberto(true) }}
                              className="p-1 hover:bg-gray-900 rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil size={12} className="text-gray-500" />
                            </button>
                          </div>
                        </div>

                        {/* Funil */}
                        <div className="mt-1.5 text-xs text-gray-500 truncate">
                          {p.funis?.id_funil && <span className="text-indigo-400/70 font-mono">[{p.funis.id_funil}]</span>}
                          {p.funis?.id_funil && ' '}
                          {p.funis?.nome ?? '—'}
                        </div>

                        {/* Badges rodapé */}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {p.etapa && (
                            <span className="text-xs text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">{p.etapa}</span>
                          )}
                          {p.prioridade && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                color: cor('prioridade', p.prioridade) ?? '#6b7280',
                                backgroundColor: `${cor('prioridade', p.prioridade) ?? '#6b7280'}20`,
                              }}
                            >
                              {p.prioridade}
                            </span>
                          )}
                          {atrasada && (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <AlertTriangle size={11} />
                              {p.data_prevista && new Date(p.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                          {pct !== null && ['Implementada', 'Publicada'].includes(p.status) && (
                            <span className={`ml-auto text-xs font-medium ${pct === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {pct === 100 ? '✓ check' : `${pct}%`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabela */}
      {visualizacao === 'tabela' && <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/60 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Página</th>
                <th className="px-4 py-3 text-left font-medium">Funil</th>
                <th className="px-4 py-3 text-left font-medium">Etapa</th>
                <th className="px-4 py-3 text-left font-medium">Ferramenta</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium">Horas</th>
                <th className="px-4 py-3 text-left font-medium">Previsão</th>
                <th className="px-4 py-3 text-left font-medium">GTmetrix</th>
                <th className="px-4 py-3 text-left font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    {paginas.length === 0 ? 'Nenhuma página cadastrada ainda.' : 'Nenhuma página encontrada com os filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                filtradas.map(raw => {
                  const p = { ...raw, ...overrides[raw.id] }
                  const atrasada = isAtrasada(p)
                  const desvio = isDesvioHoras(p)
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-900/40 transition-colors ${atrasada ? 'border-l-2 border-l-red-500' : ''}`}
                    >
                      {/* Nome */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {celula?.id === p.id && celula.campo === 'codigo' ? (
                            <div className="flex items-center gap-1">
                              <input autoFocus value={celula.valor}
                                onChange={e => setCelula(c => c ? { ...c, valor: e.target.value } : c)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSalvarCelula(); if (e.key === 'Escape') setCelula(null) }}
                                className="w-20 px-1.5 py-0.5 text-xs bg-gray-900 border border-indigo-500 rounded text-indigo-300 font-mono focus:outline-none"
                                placeholder="CP-01"
                              />
                              <button onClick={handleSalvarCelula} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
                              <button onClick={() => setCelula(null)} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>
                            </div>
                          ) : p.codigo ? (
                            <button
                              onClick={() => setCelula({ id: p.id, campo: 'codigo', valor: p.codigo ?? '' })}
                              className="text-indigo-400 font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded hover:border-indigo-400 transition-colors shrink-0"
                              title="Clique para editar código"
                            >
                              {p.codigo}
                            </button>
                          ) : (
                            <button
                              onClick={() => setCelula({ id: p.id, campo: 'codigo', valor: '' })}
                              className="text-gray-600 text-xs px-1.5 py-0.5 rounded border border-dashed border-white/10 hover:border-white/20 hover:text-gray-400 transition-colors shrink-0"
                              title="Adicionar código"
                            >
                              +código
                            </button>
                          )}
                          <span className="text-white font-medium">{p.nome}</span>
                          {p.url_pagina && (
                            <a href={p.url_pagina} target="_blank" rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 shrink-0" title="Abrir página">
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {atrasada && <span title="Prazo vencido"><AlertTriangle size={12} className="text-red-400 shrink-0" /></span>}
                        </div>
                        {editandoUrl === p.id && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <input
                              autoFocus
                              type="url"
                              value={urlTemp}
                              onChange={e => setUrlTemp(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSalvarUrl(p); if (e.key === 'Escape') setEditandoUrl(null) }}
                              placeholder="https://"
                              className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 min-w-0"
                            />
                            <button onClick={() => handleSalvarUrl(p)} className="p-1 text-green-400 hover:text-green-300"><Check size={13} /></button>
                            <button onClick={() => setEditandoUrl(null)} className="p-1 text-gray-500 hover:text-gray-300"><X size={13} /></button>
                          </div>
                        )}
                      </td>

                      {/* Funil */}
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-xs flex items-center gap-1.5">
                          {p.funis?.id_funil && (
                            <span className="text-indigo-400 font-mono shrink-0">[{p.funis.id_funil}]</span>
                          )}
                          {(!p.funis?.id_funil || p.funis.id_funil !== p.funis.nome) && (
                            <span className="truncate">{p.funis?.nome ?? '—'}</span>
                          )}
                        </span>
                      </td>

                      {/* Etapa */}
                      <td className="px-4 py-3">
                        {p.etapa ? (
                          <span className="text-gray-400 text-xs">{p.etapa}</span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Ferramenta */}
                      <td className="px-4 py-3">
                        {p.ferramenta ? (
                          <StatusBadge valor={p.ferramenta} cor={cor('ferramenta', p.ferramenta)} />
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Status — select nativo */}
                      <td className="px-4 py-3">
                        <select
                          value={p.status}
                          onChange={e => handleMudarStatus(p, e.target.value)}
                          className="appearance-none bg-transparent border-0 text-xs font-medium cursor-pointer focus:outline-none"
                          style={{ color: cor('status_pagina', p.status) ?? '#6b7280' }}
                        >
                          {configOpts('status_pagina').map(c => (
                            <option key={c.valor} value={c.valor}>{c.valor}</option>
                          ))}
                        </select>
                      </td>

                      {/* Prioridade — select nativo */}
                      <td className="px-4 py-3">
                        <select
                          value={p.prioridade ?? ''}
                          onChange={e => handleMudarPrioridade(p, e.target.value)}
                          className="appearance-none bg-transparent border-0 text-xs font-medium cursor-pointer focus:outline-none"
                          style={{ color: p.prioridade ? (cor('prioridade', p.prioridade) ?? '#6b7280') : '#4b5563' }}
                        >
                          <option value="">— prioridade</option>
                          {configOpts('prioridade').map(c => (
                            <option key={c.valor} value={c.valor}>{c.valor}</option>
                          ))}
                        </select>
                      </td>

                      {/* Horas — clicável para editar horas reais */}
                      <td className="px-4 py-3">
                        {celula?.id === p.id && celula.campo === 'horas_reais' ? (
                          <div className="flex items-center gap-1">
                            <input autoFocus type="number" min="0" step="0.5" value={celula.valor}
                              onChange={e => setCelula(c => c ? { ...c, valor: e.target.value } : c)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSalvarCelula(); if (e.key === 'Escape') setCelula(null) }}
                              className="w-16 px-1.5 py-0.5 text-xs bg-gray-900 border border-white/10 rounded text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button onClick={handleSalvarCelula} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
                            <button onClick={() => setCelula(null)} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>
                          </div>
                        ) : p.horas_estimadas != null ? (
                          <button
                            onClick={() => setCelula({ id: p.id, campo: 'horas_reais', valor: p.horas_reais?.toString() ?? '' })}
                            className={`flex items-center gap-1 text-xs hover:opacity-70 transition-opacity ${desvio ? 'text-yellow-400' : 'text-gray-400'}`}
                            title="Clique para editar horas reais"
                          >
                            {desvio && <Clock size={11} />}
                            <span>{p.horas_reais != null ? `${p.horas_reais}h` : '—'} / {p.horas_estimadas}h</span>
                          </button>
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Previsão — clicável para editar data */}
                      <td className="px-4 py-3">
                        {celula?.id === p.id && celula.campo === 'data_prevista' ? (
                          <div className="flex items-center gap-1">
                            <input autoFocus type="date" value={celula.valor}
                              onChange={e => setCelula(c => c ? { ...c, valor: e.target.value } : c)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSalvarCelula(); if (e.key === 'Escape') setCelula(null) }}
                              className="px-1.5 py-0.5 text-xs bg-gray-900 border border-white/10 rounded text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button onClick={handleSalvarCelula} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
                            <button onClick={() => setCelula(null)} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCelula({ id: p.id, campo: 'data_prevista', valor: p.data_prevista ?? '' })}
                            className={`text-xs hover:opacity-70 transition-opacity ${atrasada ? 'text-red-400 font-medium' : p.data_prevista ? 'text-gray-400' : 'text-gray-600'}`}
                            title="Clique para editar data"
                          >
                            {p.data_prevista ? new Date(p.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                          </button>
                        )}
                      </td>

                      {/* GTmetrix */}
                      <td className="px-4 py-3">
                        {(() => {
                          const grade = (p.gtmetrix_grade ?? null) as string | null
                          const score = (p.gtmetrix_score ?? null) as number | null
                          const GRADE_COR: Record<string, string> = {
                            A: '#22c55e', B: '#84cc16', C: '#eab308',
                            D: '#f97316', E: '#ef4444', F: '#dc2626',
                          }
                          if (analisando === p.id) {
                            return (
                              <div className="space-y-1 w-28">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">{estadoGtmetrix || 'Analisando'}</span>
                                  <span className="text-xs text-gray-600">{Math.round(progressoGtmetrix)}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${progressoGtmetrix}%`, backgroundColor: '#f97316' }}
                                  />
                                </div>
                              </div>
                            )
                          }
                          if (grade) {
                            const lcp = p.gtmetrix_lcp as number | null | undefined
                            const tempo = p.gtmetrix_tempo as number | null | undefined
                            const analisadoEm = p.gtmetrix_analisado_em
                              ? new Date(p.gtmetrix_analisado_em).toLocaleDateString('pt-BR')
                              : null
                            const expandido = expandidoGtmetrix === p.id
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setExpandidoGtmetrix(expandido ? null : p.id)}
                                  className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0 transition-all"
                                  style={{ backgroundColor: `${GRADE_COR[grade]}22`, color: GRADE_COR[grade], border: `1px solid ${GRADE_COR[grade]}44` }}
                                  title="Clique para ver detalhes"
                                >
                                  {grade} {score != null ? `${score}%` : ''}
                                </button>
                                {expandido && (
                                  <>
                                    {lcp != null && <span className="text-xs text-gray-500">LCP {lcp}s</span>}
                                    {tempo != null && <span className="text-xs text-gray-500">· {tempo}s</span>}
                                    {analisadoEm && <span className="text-xs text-gray-700">· {analisadoEm}</span>}
                                    {p.url_pagina && (
                                      <button onClick={() => handleAnalisarGtmetrix(p)} className="text-gray-600 hover:text-gray-400 text-xs" title="Reanalisar">↻</button>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          }
                          if (p.url_pagina && p.status === 'Publicada') {
                            return (
                              <button
                                onClick={() => handleAnalisarGtmetrix(p)}
                                className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                                title="Analisar no GTmetrix"
                              >
                                Analisar
                              </button>
                            )
                          }
                          return <span className="text-gray-700">—</span>
                        })()}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        {deletandoPagina === p.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 mr-1">Deletar?</span>
                            <button onClick={() => handleDeletar(p.id)} className="p-1 text-red-400 hover:text-red-300 hover:bg-gray-900 rounded"><Check size={12} /></button>
                            <button onClick={() => setDeletandoPagina(null)} className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-900 rounded"><X size={12} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {['Implementada', 'Publicada'].includes(p.status) && (() => {
                              const raw_cl = (p as Record<string, unknown>).checklists_publicacao
                              const cl = Array.isArray(raw_cl) ? raw_cl[0] : raw_cl as { checklist_itens: { concluido: boolean }[] } | null
                              const itens = cl?.checklist_itens ?? []
                              const total = itens.length
                              const done = itens.filter((i: { concluido: boolean }) => i.concluido).length
                              const pct = total > 0 ? Math.round((done / total) * 100) : null
                              return (
                                <button
                                  onClick={() => setChecklistPagina(p)}
                                  className="flex items-center gap-1 p-1.5 hover:bg-gray-900 rounded transition-colors"
                                  title="Checklist de publicação"
                                >
                                  <ClipboardList size={13} className={pct === 100 ? 'text-green-400' : pct !== null ? 'text-yellow-400' : 'text-indigo-400'} />
                                  {pct !== null && (
                                    <span className={`text-xs font-medium ${pct === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                                      {pct === 100 ? '✓' : `${pct}%`}
                                    </span>
                                  )}
                                </button>
                              )
                            })()}
                            <button onClick={() => { setEditandoUrl(p.id); setUrlTemp(p.url_pagina ?? '') }}
                              className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-900 rounded transition-colors"
                              title={p.url_pagina ? 'Editar URL' : 'Adicionar URL'}>
                              <LinkIcon size={13} />
                            </button>
                            <button onClick={() => handleDuplicar(p.id)}
                              className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-900 rounded transition-colors" title="Duplicar">
                              <Copy size={13} />
                            </button>
                            <button onClick={() => { setEditando(p); setModalAberto(true) }}
                              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-900 rounded transition-colors" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeletandoPagina(p.id)}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded transition-colors" title="Deletar">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>}


      <ModalPagina
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setEditando(null) }}
        onSalvo={handleSalvo}
        pagina={editando}
        funis={funis}
        configs={configs}
        funilPreSelecionado={editando ? undefined : filtroFunil || undefined}
      />

      <PainelChecklist
        pagina={checklistPagina}
        onFechar={() => setChecklistPagina(null)}
      />
    </div>
  )
}
