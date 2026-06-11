'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Clock, LayoutGrid } from 'lucide-react'
import { MapaPaginas } from '@/components/paginas/MapaPaginas'
import type { Pagina, Funil, Configuracao } from '@/lib/types'

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
  historico: HistoricoEvento[]
  configs: Configuracao[]
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

export function DetalhesFunil({ funil, paginas, historico, configs }: Props) {
  const [aba, setAba] = useState<'timeline' | 'paginas'>('timeline')

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
      <div className="flex gap-1 border-b border-white/10">
        {([
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'paginas',  label: 'Páginas',  icon: LayoutGrid },
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
        <MapaPaginas
          paginas={paginas}
          funis={[funil] as never}
          especialistas={[]}
          configs={configs}
          initialFunilId={funil.id}
        />
      )}
    </div>
  )
}
