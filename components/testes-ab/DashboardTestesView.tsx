'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlaskConical, ExternalLink, Trophy, Rocket, TrendingDown, TrendingUp, Equal, Percent, Target } from 'lucide-react'
import { calcularKpis, agruparPor, type LinhaAgrupada, type KpisDashboard } from '@/lib/dashboard-testes'
import { SectionLabel } from '@/components/dashboard/DashboardView'
import type { TesteAB } from '@/lib/types'

interface Props {
  testes: TesteAB[]
}

function diasEntre(dataInicio?: string | null): number | null {
  if (!dataInicio) return null
  return Math.max(0, Math.round((Date.now() - new Date(dataInicio).getTime()) / 86400000))
}

function fmtPct(v: number | null, casas = 0): string {
  return v === null ? '—' : `${v.toFixed(casas)}%`
}

function fmtLift(v: number | null): string {
  if (v === null) return '—'
  const sinal = v >= 0 ? '+' : ''
  return `${sinal}${v.toFixed(1)}%`
}

const LAYOUT_LABEL: Record<string, string> = { curto: 'Curto', longo: 'Longo' }

function resumoLayout(variantes: { layout?: string | null }[]): string | null {
  const comLayout = variantes.filter(v => v.layout)
  if (comLayout.length === 0) return null
  const valores = new Set(comLayout.map(v => v.layout))
  if (valores.size === 1) return LAYOUT_LABEL[comLayout[0].layout as string] ?? comLayout[0].layout ?? null
  return 'Misto'
}

function urlAtivacaoDoTeste(t: TesteAB): string | null {
  if (t.url_ativacao) return t.url_ativacao
  const primeira = (t.variantes_teste ?? []).find(v => v.url_variante)?.url_variante
  if (!primeira) return null
  try {
    const url = new URL(primeira)
    const segmentos = url.pathname.split('/').filter(Boolean)
    segmentos.pop()
    return `${url.origin}${segmentos.length ? '/' + segmentos.join('/') : ''}`
  } catch {
    return null
  }
}

const KPI_CARDS: {
  chave: keyof KpisDashboard
  label: string
  cor: string
  formato: 'int' | 'pct0' | 'pct1' | 'lift'
  icon: React.ElementType
  status?: string
}[] = [
  { chave: 'testesTotais', label: 'Testes Totais', cor: '#6366f1', formato: 'int', icon: FlaskConical },
  { chave: 'ativos', label: 'Ativos', cor: '#0ea5e9', formato: 'int', icon: Rocket, status: 'Ativo' },
  { chave: 'vencedores', label: 'Vencedores', cor: '#22c55e', formato: 'int', icon: Trophy },
  { chave: 'perdedores', label: 'Perdedores', cor: '#ef4444', formato: 'int', icon: TrendingDown },
  { chave: 'empates', label: 'Empates', cor: '#9ca3af', formato: 'int', icon: Equal },
  { chave: 'winRate', label: 'Win Rate', cor: '#a78bfa', formato: 'pct0', icon: Percent },
  { chave: 'cvrMedioVencedor', label: 'CVR Médio (Vencedoras)', cor: '#2dd4bf', formato: 'pct1', icon: Target },
  { chave: 'liftMedioVencedor', label: 'Lift Médio (Vencedoras)', cor: '#34d399', formato: 'lift', icon: TrendingUp },
]

function TabelaAgrupada({ titulo, subtitulo, linhas, rotuloChave }: { titulo: string; subtitulo?: string; linhas: LinhaAgrupada[]; rotuloChave: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className={`text-white font-medium flex items-center gap-2 ${subtitulo ? 'mb-1' : 'mb-4'}`}>
        <Trophy size={15} className="text-indigo-400" /> {titulo}
      </h3>
      {subtitulo && <p className="text-gray-600 text-xs mb-4">{subtitulo}</p>}
      {linhas.length === 0 ? (
        <p className="text-gray-600 text-sm">Sem dados suficientes ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-2 pr-4 font-medium">{rotuloChave}</th>
                <th className="py-2 px-4 font-medium text-right">Total</th>
                <th className="py-2 px-4 font-medium text-right">Vencedores</th>
                <th className="py-2 px-4 font-medium text-right">Win Rate</th>
                <th className="py-2 px-4 font-medium text-right">Lift Médio</th>
                <th className="py-2 pl-4 font-medium text-right">CVR Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {linhas.map(l => (
                <tr key={l.chave}>
                  <td className="py-2.5 pr-4 text-gray-300">{l.chave}</td>
                  <td className="py-2.5 px-4 text-gray-400 text-right">{l.total}</td>
                  <td className="py-2.5 px-4 text-gray-400 text-right">{l.vencedores}</td>
                  <td className={`py-2.5 px-4 text-right font-medium ${l.winRate !== null && l.winRate >= 50 ? 'text-green-400' : 'text-gray-400'}`}>
                    {fmtPct(l.winRate)}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${l.liftMedio !== null && l.liftMedio >= 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    {fmtLift(l.liftMedio)}
                  </td>
                  <td className="py-2.5 pl-4 text-gray-400 text-right">{fmtPct(l.cvrMedio, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function DashboardTestesView({ testes }: Props) {
  const [tipoAtivo, setTipoAtivo] = useState<'todos' | 'aquisicao' | 'vendas'>('todos')
  const [filtroCampanha, setFiltroCampanha] = useState('__all__')

  const campanhasOpcoes = useMemo(
    () => Array.from(new Set(testes.map(t => t.campanhas?.codigo).filter((v): v is string => !!v))).sort(),
    [testes]
  )

  const filtrados = useMemo(() => testes.filter(t => {
    if (tipoAtivo !== 'todos' && t.tipo_teste !== tipoAtivo) return false
    if (filtroCampanha !== '__all__' && t.campanhas?.codigo !== filtroCampanha) return false
    return true
  }), [testes, tipoAtivo, filtroCampanha])

  const kpis = useMemo(() => calcularKpis(filtrados), [filtrados])
  const porSegmento = useMemo(() => agruparPor(filtrados, t => t.segmento ?? null), [filtrados])
  const porElemento = useMemo(() => agruparPor(filtrados, t => t.elemento_testado ?? null), [filtrados])
  const porAngulo = useMemo(() => agruparPor(filtrados, t => t.angulos ?? null), [filtrados])

  const testesAtivos = useMemo(
    () => filtrados
      .filter(t => t.status === 'Ativo')
      .sort((a, b) => (diasEntre(b.data_inicio) ?? 0) - (diasEntre(a.data_inicio) ?? 0)),
    [filtrados]
  )

  const selectCls = 'bg-gray-900 border-gray-800 text-white focus:ring-0 focus:ring-offset-0 h-9 text-sm'
  const itemCls = 'text-gray-300 focus:bg-gray-800 focus:text-white'

  if (testes.length === 0) {
    return (
      <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl p-14 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
          <FlaskConical size={22} />
        </div>
        <h3 className="text-lg font-semibold text-white">Inteligência A/B</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Ainda não há experimentos cadastrados. Assim que os primeiros testes forem criados,
          este painel mostra win rate, lift e os padrões de sucesso por segmento, elemento e ângulo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          {(['todos', 'aquisicao', 'vendas'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoAtivo(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tipoAtivo === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'aquisicao' ? 'Aquisição' : 'Vendas'}
            </button>
          ))}
        </div>
        <Select value={filtroCampanha} onValueChange={setFiltroCampanha}>
          <SelectTrigger className={`w-48 ${selectCls}`}><SelectValue placeholder="Campanha" /></SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            <SelectItem value="__all__" className={itemCls}>Todas as campanhas</SelectItem>
            {campanhasOpcoes.map(c => <SelectItem key={c} value={c} className={itemCls}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div>
        <SectionLabel>Visão Geral</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KPI_CARDS.map(({ chave, label, cor, formato, icon: Icon, status }) => {
            const valorBruto = kpis[chave]
            const valor = formato === 'int'
              ? String(valorBruto ?? 0)
              : formato === 'pct0'
              ? fmtPct(valorBruto, 0)
              : formato === 'pct1'
              ? fmtPct(valorBruto, 1)
              : fmtLift(valorBruto)

            const href = chave === 'testesTotais' || status
              ? (() => {
                  const params = new URLSearchParams()
                  if (status) params.set('status', status)
                  if (tipoAtivo !== 'todos') params.set('tipo', tipoAtivo)
                  const qs = params.toString()
                  return `/variantes${qs ? `?${qs}` : ''}`
                })()
              : undefined

            const conteudo = (
              <div
                className={`rounded-xl p-4 h-full transition-colors ${href ? 'hover:border-opacity-70 cursor-pointer' : ''}`}
                style={{ backgroundColor: `${cor}15`, border: `1px solid ${cor}35` }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: cor }}>{label}</p>
                  <Icon size={14} style={{ color: cor }} />
                </div>
                <p className="text-[28px] leading-none font-medium text-white">{valor}</p>
              </div>
            )

            return href ? (
              <Link key={chave} href={href} className="block h-full">{conteudo}</Link>
            ) : (
              <div key={chave}>{conteudo}</div>
            )
          })}
        </div>
      </div>

      {/* Breakdowns */}
      <div>
        <SectionLabel>Padrões de Sucesso</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TabelaAgrupada titulo="Win Rate por Segmento" linhas={porSegmento} rotuloChave="Segmento" />
          <TabelaAgrupada titulo="Win Rate por Elemento Testado" linhas={porElemento} rotuloChave="Elemento" />
        </div>
        <div className="mt-4">
          <TabelaAgrupada
            titulo="Ângulos presentes em testes vencedores"
            subtitulo="Descreve a mensagem da Hero no teste, não necessariamente a variável testada — não interprete como causa da vitória sem cruzar com o Elemento Testado."
            linhas={porAngulo}
            rotuloChave="Ângulo"
          />
        </div>
      </div>

      {/* Testes Ativos */}
      <div>
        <SectionLabel>Em Andamento</SectionLabel>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <FlaskConical size={15} className="text-indigo-400" /> Testes Ativos ({testesAtivos.length})
        </h3>
        {testesAtivos.length === 0 ? (
          <p className="text-gray-600 text-sm">Nenhum teste ativo agora com esses filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Experimento</th>
                  <th className="py-2 px-4 font-medium">Funil</th>
                  <th className="py-2 px-4 font-medium">Campanha</th>
                  <th className="py-2 px-4 font-medium">Segmento</th>
                  <th className="py-2 px-4 font-medium">Elemento</th>
                  <th className="py-2 px-4 font-medium">Layout</th>
                  <th className="py-2 px-4 font-medium text-right">Dias Rodando</th>
                  <th className="py-2 pl-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {testesAtivos.map(t => {
                  const dias = diasEntre(t.data_inicio)
                  const url = urlAtivacaoDoTeste(t)
                  return (
                    <tr key={t.id} className="hover:bg-gray-900/60 transition-colors">
                      <td className="py-2.5 pr-4">
                        <Link href={`/variantes/${t.id}`} className="text-white font-medium hover:text-indigo-400 transition-colors">
                          {t.nome}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-gray-400">{t.funis?.nome ?? '—'}</td>
                      <td className="py-2.5 px-4 text-gray-400">{t.campanhas?.codigo ?? '—'}</td>
                      <td className="py-2.5 px-4 text-gray-400">{t.segmento ?? '—'}</td>
                      <td className="py-2.5 px-4 text-gray-400">{t.elemento_testado ?? '—'}</td>
                      <td className="py-2.5 px-4 text-gray-400">{resumoLayout(t.variantes_teste ?? []) ?? '—'}</td>
                      <td className={`py-2.5 px-4 text-right ${dias !== null && dias > 14 ? 'text-amber-400' : 'text-gray-400'}`}>
                        {dias !== null ? `${dias}d` : '—'}
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-400 transition-colors inline-flex" title="Acessar URL de ativação">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
