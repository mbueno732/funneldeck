import Link from 'next/link'
import { AlertTriangle, CheckCircle, Clock, Zap, ListTodo, CalendarX, TrendingUp, PauseCircle } from 'lucide-react'

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
  paginas_sem_data: number
  funis_sem_movimento: number
  publicadas_mes: number
}

interface EspecialistaResumo {
  id: string
  nome: string
  total_funis: number
  funis_ativos: number
  total_paginas: number
  paginas_publicadas: number
  paginas_atrasadas: number
}

interface StatusConfig {
  valor: string
  cor: string | null
}

type CardCor = 'indigo' | 'green' | 'yellow' | 'amber' | 'red' | 'blue' | 'orange' | 'gray'

const STATUS_COR_DEFAULT: Record<string, string> = {
  'A fazer':      '#6b7280',
  'Em andamento': '#3b82f6',
  'Implementada': '#f59e0b',
  'Publicada':    '#22c55e',
}

const ICON_BG: Record<CardCor, string> = {
  indigo: 'bg-indigo-500/10 text-indigo-400',
  green:  'bg-green-500/10 text-green-400',
  yellow: 'bg-yellow-500/10 text-yellow-400',
  amber:  'bg-amber-500/10 text-amber-400',
  red:    'bg-red-500/10 text-red-400',
  blue:   'bg-blue-500/10 text-blue-400',
  orange: 'bg-orange-500/10 text-orange-400',
  gray:   'bg-gray-700 text-gray-400',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium tracking-[.06em] text-gray-500 uppercase mb-2">
      {children}
    </p>
  )
}

function KpiCard({ label, value, sub, icon: Icon, cor, href, badge, highlight }: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  cor: CardCor
  href?: string
  badge?: string
  highlight?: 'ok'
}) {
  const numVal = Number(value)
  const isAlert = (cor === 'red' || cor === 'amber' || cor === 'orange') && numVal > 0
  const isOk    = (cor === 'red' || cor === 'amber') && numVal === 0

  const borderCls =
    highlight === 'ok'              ? 'border-l-[3px] border-l-green-500/70 border-gray-700' :
    cor === 'orange' && isAlert     ? 'border-l-[3px] border-l-orange-500 border-gray-700' :
    cor === 'red'    && isAlert     ? 'border-red-500/40' :
    cor === 'amber'  && isAlert     ? 'border-amber-500/20' :
    'border-gray-700'

  const valueCls =
    isOk                             ? 'text-green-400' :
    cor === 'red'    && isAlert      ? 'text-red-400' :
    cor === 'amber'  && isAlert      ? 'text-amber-400' :
    cor === 'orange' && isAlert      ? 'text-orange-400' :
    'text-white'

  const iconCls = isOk ? 'bg-green-500/10 text-green-400' : ICON_BG[cor]

  const badgeCls =
    cor === 'orange' ? 'bg-orange-500/10 text-orange-400' :
    cor === 'amber'  ? 'bg-amber-500/10 text-amber-400' :
    cor === 'red'    ? 'bg-red-500/10 text-red-400' :
    'bg-gray-700 text-gray-400'

  const content = (
    <div className={`bg-gray-900 border rounded-xl p-4 space-y-3 h-full transition-colors ${
      href ? 'hover:border-gray-600 cursor-pointer' : ''
    } ${borderCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className={`p-2 rounded-lg ${iconCls}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className={`text-[28px] font-medium leading-none mb-1 ${valueCls}`}>{value}</p>
        {sub && <p className="text-gray-500 text-xs">{sub}</p>}
        {badge && (
          <span className={`inline-flex items-center mt-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeCls}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )

  return href ? <Link href={href} className="block h-full">{content}</Link> : content
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{value} publicadas</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : pct > 50 ? '#6366f1' : '#3b82f6' }}
        />
      </div>
    </div>
  )
}

export function DashboardView({
  kpis,
  porEspecialista,
  statusConfigs,
}: {
  kpis: Kpis
  porEspecialista: EspecialistaResumo[]
  statusConfigs: StatusConfig[]
}) {
  const colorMap = Object.fromEntries(statusConfigs.map(c => [c.valor, c.cor]))
  const getColor = (status: string) => colorMap[status] ?? STATUS_COR_DEFAULT[status] ?? '#4b5563'

  const pipelineStatuses = ['A fazer', 'Em andamento', 'Implementada', 'Publicada']
  const pipelineData = pipelineStatuses.map(s => {
    const count =
      s === 'A fazer'      ? kpis.paginas_a_fazer :
      s === 'Em andamento' ? kpis.paginas_em_andamento :
      s === 'Implementada' ? kpis.paginas_implementadas :
      kpis.paginas_publicadas
    return {
      status: s,
      count,
      cor: getColor(s),
      pct: kpis.total_paginas > 0 ? Math.round((count / kpis.total_paginas) * 100) : 0,
    }
  })

  const temAlerta = kpis.paginas_atrasadas > 0 || kpis.checklists_bloqueando > 0
  const mesPorExtenso = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">

      {/* Pipeline bar */}
      {kpis.total_paginas > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Pipeline de produção</p>
            <span className="text-xs text-gray-500">
              {kpis.total_paginas} páginas · {kpis.funis_ativos} funis ativos
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-px">
            {pipelineData.map(({ status, pct, cor }) =>
              pct > 0 ? (
                <div key={status} className="h-full" style={{ width: `${pct}%`, backgroundColor: cor }} title={`${status}: ${pct}%`} />
              ) : null
            )}
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            {pipelineData.map(({ status, count, cor, pct }) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                <span className="text-xs text-gray-500">{status}</span>
                <span className="text-xs text-white font-medium">{count}</span>
                <span className="text-xs text-gray-600">({pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banner de alerta condicional */}
      {temAlerta && (
        <div className="flex flex-wrap gap-3">
          {kpis.paginas_atrasadas > 0 && (
            <Link href="/paginas?atrasadas=1" className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 hover:bg-red-500/15 transition-colors">
              <AlertTriangle size={14} />
              <span className="font-medium">{kpis.paginas_atrasadas} página{kpis.paginas_atrasadas !== 1 ? 's' : ''} atrasada{kpis.paginas_atrasadas !== 1 ? 's' : ''}</span>
              <span className="text-red-500/60">→ ver</span>
            </Link>
          )}
          {kpis.checklists_bloqueando > 0 && (
            <Link href="/paginas?status=Implementada" className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400 hover:bg-amber-500/15 transition-colors">
              <ListTodo size={14} />
              <span className="font-medium">{kpis.checklists_bloqueando} checklist{kpis.checklists_bloqueando !== 1 ? 's' : ''} bloqueando publicação</span>
              <span className="text-amber-500/60">→ ver</span>
            </Link>
          )}
        </div>
      )}

      {/* FLUXO */}
      <div>
        <SectionLabel>Fluxo</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="A Fazer"       value={kpis.paginas_a_fazer}       sub="backlog"               icon={ListTodo}    cor="gray"                                               href="/paginas?status=A+fazer" />
          <KpiCard label="Em Andamento"  value={kpis.paginas_em_andamento}  sub="em produção agora"     icon={Clock}       cor="blue"                                               href="/paginas?status=Em+andamento" />
          <KpiCard label="Implementadas" value={kpis.paginas_implementadas} sub="aguardando publicação" icon={Zap}         cor={kpis.paginas_implementadas > 0 ? 'yellow' : 'gray'} href="/paginas?status=Implementada" />
          <KpiCard label="Publicadas"    value={kpis.paginas_publicadas}    sub={`${kpis.pct_publicadas}% do total`} icon={CheckCircle} cor="green" highlight="ok"               href="/paginas?status=Publicada" />
        </div>
      </div>

      {/* SAÚDE */}
      <div>
        <SectionLabel>Saúde</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Atrasadas"         value={kpis.paginas_atrasadas}     sub="prazo vencido"            icon={AlertTriangle} cor="red"    href="/paginas?atrasadas=1" />
          <KpiCard label="Check. Bloqueando" value={kpis.checklists_bloqueando} sub="impl. com itens pendentes" icon={ListTodo}      cor="amber"  href="/paginas?status=Implementada" />
          <KpiCard label="Sem Prazo"         value={kpis.paginas_sem_data}      sub="em andamento sem data"    icon={CalendarX}     cor="gray"   href="/paginas?status=Em+andamento" />
          <KpiCard
            label="Funis Parados"
            value={kpis.funis_sem_movimento}
            sub="ativos sem páginas em prod."
            icon={PauseCircle}
            cor="orange"
            href="/funis"
            badge={kpis.funis_sem_movimento > 0 ? 'requer atenção' : undefined}
          />
        </div>
      </div>

      {/* PUBLICAÇÕES NO MÊS */}
      {/* TODO: 3 slots disponíveis para futuras métricas (ex: horas estimadas vs reais, velocidade média por etapa) */}
      <div>
        <SectionLabel>Publicações no mês</SectionLabel>
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            label="Publicadas no Mês"
            value={kpis.publicadas_mes}
            sub={mesPorExtenso}
            icon={TrendingUp}
            cor={kpis.publicadas_mes > 0 ? 'green' : 'gray'}
            href="/paginas?status=Publicada"
          />
        </div>
      </div>

      {/* POR ESPECIALISTA */}
      {porEspecialista.length > 0 && (
        <div>
          <SectionLabel>Por Especialista</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {porEspecialista.map(esp => {
              const pct = esp.total_paginas > 0 ? Math.round((esp.paginas_publicadas / esp.total_paginas) * 100) : 0
              return (
                <Link key={esp.id} href={`/funis?especialista=${esp.id}`} className="block h-full">
                  <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3 h-full hover:border-gray-600 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">{esp.nome}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{esp.funis_ativos} funis ativos</span>
                        {esp.paginas_atrasadas > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertTriangle size={11} />
                            {esp.paginas_atrasadas} atrasada{esp.paginas_atrasadas !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <ProgressBar value={esp.paginas_publicadas} max={esp.total_paginas} />
                    {esp.total_paginas === 0 ? (
                      <p className="text-gray-600 text-xs">nenhuma página cadastrada ainda</p>
                    ) : (
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span><strong className="text-gray-300 font-medium">{esp.paginas_publicadas}</strong> publicadas</span>
                        <span><strong className="text-gray-300 font-medium">{pct}%</strong> do total</span>
                        <span><strong className="text-gray-300 font-medium">{esp.total_paginas}</strong> páginas</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Estado vazio global */}
      {kpis.total_paginas === 0 && kpis.total_funis === 0 && (
        <div className="rounded-xl border border-gray-700 p-12 text-center space-y-3">
          <p className="text-gray-400">Nenhum dado ainda.</p>
          <p className="text-gray-600 text-sm">
            Comece cadastrando{' '}
            <Link href="/especialistas" className="text-orange-400 hover:underline">especialistas</Link>,{' '}
            <Link href="/produtos" className="text-orange-400 hover:underline">produtos</Link> e{' '}
            <Link href="/funis" className="text-orange-400 hover:underline">funis</Link>.
          </p>
        </div>
      )}
    </div>
  )
}
