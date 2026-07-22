'use client'
import { useState, Suspense } from 'react'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { FiltroDashboard } from '@/components/dashboard/FiltroDashboard'
import { FiltroMes } from '@/components/dashboard/FiltroMes'
import { DashboardTestesView } from '@/components/testes-ab/DashboardTestesView'
import type { TesteAB } from '@/lib/types'

interface Kpis {
  total_paginas: number
  paginas_publicadas: number
  paginas_em_andamento: number
  paginas_implementadas: number
  paginas_atrasadas: number
  paginas_a_fazer: number
  total_funis: number
  funis_ativos: number
  pct_publicadas: number
  checklists_bloqueando: number
  paginas_paradas: number
  taxa_entrega_mes: number | null
  funis_sem_movimento: number
  publicadas_mes: number
}

interface HorasKpis {
  estimadas: number
  reais: number
  desvio_pct: number
  top_desvios: { nome: string; estimadas: number; reais: number; desvio: number }[]
}

interface EspecialistaResumo {
  id: string
  nome: string
  total_funis: number
  funis_ativos: number
  total_paginas: number
  paginas_publicadas: number
  paginas_atrasadas: number
  horas_estimadas: number
  horas_reais: number
}

interface StatusConfig {
  valor: string
  cor: string | null
}

interface Props {
  kpis: Kpis
  porEspecialista: EspecialistaResumo[]
  statusConfigs: StatusConfig[]
  mesLabel: string
  mesAtual: string
  horasKpis: HorasKpis
  testesAB: TesteAB[]
  mesesDisponiveis: string[]
  especialistas: { id: string; nome: string; ativo: boolean; criado_em: string; atualizado_em: string }[]
}

export function DashboardV2View({
  kpis, porEspecialista, statusConfigs, mesLabel, mesAtual, horasKpis,
  testesAB, mesesDisponiveis, especialistas,
}: Props) {
  const [aba, setAba] = useState<'operacao' | 'ab'>('operacao')

  return (
    <div className="flex flex-col gap-6" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {/* Cabeçalho + filtros + toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white">Central de Comando</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Visão em tempo real da saúde da produção e da velocidade dos experimentos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense><FiltroMes mesesDisponiveis={mesesDisponiveis} /></Suspense>
          <Suspense><FiltroDashboard especialistas={especialistas} /></Suspense>
        </div>
      </div>
      <div className="flex justify-end -mt-4 md:-mt-2">
        <div className="bg-gray-900 p-1 rounded-lg inline-flex border border-gray-800">
          <button
            onClick={() => setAba('operacao')}
            className={`px-5 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide transition-colors ${
              aba === 'operacao'
                ? 'bg-gray-800 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Operação
          </button>
          <button
            onClick={() => setAba('ab')}
            className={`px-5 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide transition-colors ${
              aba === 'ab'
                ? 'bg-gray-800 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Inteligência A/B
          </button>
        </div>
      </div>

      {aba === 'operacao' ? (
        // Exatamente o mesmo Dashboard operacional que já existia — mesmos KPIs, mesmo componente.
        <DashboardView
          kpis={kpis}
          porEspecialista={porEspecialista}
          statusConfigs={statusConfigs}
          mesLabel={mesLabel}
          mesAtual={mesAtual}
          horasKpis={horasKpis}
        />
      ) : (
        <DashboardTestesView testes={testesAB} />
      )}
    </div>
  )
}
