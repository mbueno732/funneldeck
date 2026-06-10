'use client'
import { useState, useEffect } from 'react'
import { X, CheckSquare, Square, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { buscarChecklist, toggleItemChecklist, atualizarChecklistMeta, criarChecklistManual } from '@/lib/actions/checklists'
import { buscarHistoricoStatus } from '@/lib/actions/historico'
import type { Pagina } from '@/lib/types'

type Item = { id: string; fase: string; item: string; concluido: boolean; ordem: number }
type HistoricoItem = {
  id: string
  status_anterior: string | null
  status_novo: string
  criado_em: string
  usuarios?: { nome: string; email: string } | null
}

type Checklist = {
  id: string
  vsl_ativo: boolean
  observacao_geral: string | null
  checklist_itens: Item[]
}

const FASES = ['setup', 'desenvolvimento', 'testes', 'performance']
const FASE_LABEL: Record<string, string> = {
  setup: 'Setup', desenvolvimento: 'Desenvolvimento', testes: 'Testes', performance: 'Performance'
}

const GRADE_COR: Record<string, string> = {
  A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', E: '#ef4444', F: '#dc2626',
}

interface Props {
  pagina: Pagina | null
  onFechar: () => void
}

export function PainelChecklist({ pagina, onFechar }: Props) {
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [fasesAbertas, setFasesAbertas] = useState<Record<string, boolean>>({
    setup: true, desenvolvimento: true, testes: true, performance: true
  })

  useEffect(() => {
    if (!pagina) { setChecklist(null); setHistorico([]); return }
    setCarregando(true)
    setHistoricoAberto(false)
    Promise.all([
      buscarChecklist(pagina.id),
      buscarHistoricoStatus(pagina.id),
    ]).then(([cl, hist]) => {
      setChecklist(cl as Checklist | null)
      setHistorico(hist as HistoricoItem[])
    }).finally(() => setCarregando(false))
  }, [pagina])

  async function handleToggleItem(item: Item) {
    if (!checklist) return
    const novo = !item.concluido
    setChecklist(c => c ? {
      ...c,
      checklist_itens: c.checklist_itens.map(i => i.id === item.id ? { ...i, concluido: novo } : i)
    } : c)
    await toggleItemChecklist(item.id, novo)
  }

  async function handleVsl(valor: boolean) {
    if (!checklist) return
    setChecklist(c => c ? { ...c, vsl_ativo: valor } : c)
    await atualizarChecklistMeta(checklist.id, { vsl_ativo: valor })
  }

  async function handleObservacao(valor: string) {
    if (!checklist) return
    setChecklist(c => c ? { ...c, observacao_geral: valor } : c)
    await atualizarChecklistMeta(checklist.id, { observacao_geral: valor || null })
  }

  if (!pagina) return null

  const itens = checklist?.checklist_itens ?? []
  const total = itens.length
  const concluidos = itens.filter(i => i.concluido).length
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const vsl = checklist?.vsl_ativo ?? false

  const grade = pagina.gtmetrix_grade as string | null | undefined
  const gtmetrixScore = pagina.gtmetrix_score as number | null | undefined
  const gtmetrixLcp = pagina.gtmetrix_lcp as number | null | undefined

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-30 bg-black/40" onClick={onFechar} />

      {/* Painel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-40 bg-gray-900 border-l border-gray-600 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-600 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-indigo-400 shrink-0" />
              <h2 className="text-white font-semibold truncate">Checklist de Publicação</h2>
            </div>
            <p className="text-gray-500 text-xs mt-0.5 truncate">{pagina.nome}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors shrink-0 ml-2">
            <X size={16} />
          </button>
        </div>

        {carregando ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 text-sm animate-pulse">Carregando checklist...</p>
          </div>
        ) : !checklist ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-gray-400 text-sm">Checklist não criado ainda.</p>
                <p className="text-gray-600 text-xs">Esta página não passou por &quot;Implementada&quot;.</p>
              </div>
              <button
                onClick={async () => {
                  setCarregando(true)
                  try {
                    await criarChecklistManual(pagina.id)
                    const data = await buscarChecklist(pagina.id)
                    setChecklist(data as Checklist | null)
                  } finally { setCarregando(false) }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
              >
                Criar checklist
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Progresso */}
            <div className="p-5 border-b border-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{concluidos} de {total} itens</span>
                <span className={`text-sm font-bold ${pct === 100 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : pct >= 60 ? '#eab308' : '#f97316' }}
                />
              </div>
            </div>

            {/* Toggle VSL */}
            <div className="px-5 py-4 border-b border-gray-600">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-white font-medium">Página tem VSL</p>
                  <p className="text-xs text-gray-500 mt-0.5">Score GTmetrix esperado é menor com VSL</p>
                </div>
                <button
                  onClick={() => handleVsl(!vsl)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${vsl ? 'bg-indigo-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${vsl ? 'translate-x-5' : ''}`} />
                </button>
              </label>
            </div>

            {/* Itens por fase */}
            <div className="divide-y divide-gray-700/60">
              {FASES.map(fase => {
                const itensFase = itens.filter(i => i.fase === fase).sort((a, b) => a.ordem - b.ordem)
                if (!itensFase.length) return null
                const faseAberta = fasesAbertas[fase] ?? true
                const faseConcluidos = itensFase.filter(i => i.concluido).length

                return (
                  <div key={fase}>
                    <button
                      onClick={() => setFasesAbertas(f => ({ ...f, [fase]: !faseAberta }))}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/40 transition-colors"
                    >
                      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {FASE_LABEL[fase]}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{faseConcluidos}/{itensFase.length}</span>
                        {faseAberta ? <ChevronDown size={13} className="text-gray-600" /> : <ChevronRight size={13} className="text-gray-600" />}
                      </div>
                    </button>

                    {faseAberta && (
                      <div className="px-5 pb-3 space-y-1">
                        {itensFase.map(item => {
                          const isGtmetrix = item.item.toLowerCase().includes('gtmetrix')
                          return (
                            <div key={item.id} className="space-y-1">
                              <button
                                onClick={() => handleToggleItem(item)}
                                className="w-full flex items-start gap-3 py-1.5 group text-left"
                              >
                                <div className="shrink-0 mt-0.5">
                                  {item.concluido
                                    ? <CheckSquare size={15} className="text-indigo-400" />
                                    : <Square size={15} className="text-gray-600 group-hover:text-gray-400" />
                                  }
                                </div>
                                <span className={`text-sm leading-snug ${item.concluido ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                                  {item.item}
                                </span>
                              </button>

                              {/* GTmetrix badge integrado */}
                              {isGtmetrix && grade && (
                                <div className="ml-6 flex items-center gap-2">
                                  <span
                                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: `${GRADE_COR[grade]}22`, color: GRADE_COR[grade], border: `1px solid ${GRADE_COR[grade]}44` }}
                                  >
                                    {grade} {gtmetrixScore}%
                                  </span>
                                  {gtmetrixLcp && <span className="text-xs text-gray-500">LCP {gtmetrixLcp}s</span>}
                                  {vsl && (grade === 'B' || grade === 'A') && (
                                    <span className="text-xs text-green-400">✓ Aprovado com VSL</span>
                                  )}
                                  {vsl && grade && !['A', 'B'].includes(grade) && (
                                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                                      <AlertTriangle size={11} /> Revisar otimizações
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Observações */}
            <div className="p-5 border-t border-gray-600">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Observações</p>
              <textarea
                value={checklist.observacao_geral ?? ''}
                onChange={e => handleObservacao(e.target.value)}
                placeholder="Notas sobre a publicação..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Histórico de status */}
            {historico.length > 0 && (
              <div className="border-t border-gray-600">
                <button
                  onClick={() => setHistoricoAberto(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <span className="font-medium uppercase tracking-wide">Histórico de status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{historico.length} alteraç{historico.length === 1 ? 'ão' : 'ões'}</span>
                    {historicoAberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </div>
                </button>

                {historicoAberto && (
                  <div className="px-5 pb-5 space-y-3">
                    {historico.map((h, i) => (
                      <div key={h.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                          {i < historico.length - 1 && <div className="w-px flex-1 bg-gray-800 mt-1" />}
                        </div>
                        <div className="pb-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {h.status_anterior && (
                              <>
                                <span className="text-xs text-gray-500">{h.status_anterior}</span>
                                <span className="text-gray-700">→</span>
                              </>
                            )}
                            <span className="text-xs text-white font-medium">{h.status_novo}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-600">
                              {new Date(h.criado_em).toLocaleDateString('pt-BR')} às {new Date(h.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {h.usuarios?.nome && (
                              <span className="text-xs text-gray-600">· {h.usuarios.nome}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
