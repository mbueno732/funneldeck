'use client'
import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, FlaskConical, Trophy, Search, ChevronDown, ChevronRight, Check, Info, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { atualizarMetricasVariante, deletarTesteAB } from '@/lib/actions/testes-ab'
import type { TesteAB, Funil } from '@/lib/types'

type Variante = NonNullable<TesteAB['variantes_teste']>[number]
type Metricas = { sessoes: number; conversoes: number; receita: number; sessoes_checkout: number }

const STATUS_COR: Record<string, string> = {
  'Planejado':             'bg-gray-800 text-gray-400 border-gray-700',
  'Ativo':                 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Finalizado':            'bg-green-500/10 text-green-400 border-green-500/20',
  'Vencedor implementado': 'bg-green-500/10 text-green-400 border-green-500/20',
}
const STATUS_OPCOES = Object.keys(STATUS_COR)

const TIPO_LABEL: Record<string, string> = { vendas: 'Vendas', aquisicao: 'Aquisição' }
const TIPO_COR: Record<string, string> = {
  vendas:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  aquisicao:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const SEGMENTO_COR: Record<string, string> = {
  'Quente':    'bg-red-500/10 text-red-400 border-red-500/20',
  'Frio':      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Orgânico':  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Amplo':     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Geral':     'bg-gray-700/30 text-gray-400 border-gray-600/30',
}

const PERIODOS = [
  { valor: '__all__', label: 'Todo o período' },
  { valor: '7',        label: 'Últimos 7 dias' },
  { valor: '30',       label: 'Últimos 30 dias' },
  { valor: '90',       label: 'Últimos 90 dias' },
]

function taxaConversao(sessoes: number, conversoes: number): number {
  return sessoes > 0 ? (conversoes / sessoes) * 100 : 0
}

function liftDaVencedora(t: TesteAB): number | null {
  const controle = t.variantes_teste?.find(v => v.is_controle)
  const vencedora = t.variantes_teste?.find(v => v.is_vencedor)
  if (!controle || !vencedora || controle.id === vencedora.id) return null
  const crControle = taxaConversao(controle.sessoes ?? 0, controle.conversoes ?? 0)
  if (crControle <= 0) return null
  const crVencedora = taxaConversao(vencedora.sessoes ?? 0, vencedora.conversoes ?? 0)
  return ((crVencedora - crControle) / crControle) * 100
}

function liderAtual(t: TesteAB): { variante: NonNullable<TesteAB['variantes_teste']>[number]; cr: number; lift: number } | null {
  const controle = t.variantes_teste?.find(v => v.is_controle)
  if (!controle || !controle.sessoes) return null
  const crControle = taxaConversao(controle.sessoes, controle.conversoes ?? 0)
  if (crControle <= 0) return null
  const desafiantes = (t.variantes_teste ?? []).filter(v => !v.is_controle && (v.sessoes ?? 0) > 0)
  if (desafiantes.length === 0) return null
  const melhor = desafiantes.reduce((acc, v) => {
    const cr = taxaConversao(v.sessoes ?? 0, v.conversoes ?? 0)
    return !acc || cr > acc.cr ? { variante: v, cr } : acc
  }, null as { variante: NonNullable<TesteAB['variantes_teste']>[number]; cr: number } | null)
  if (!melhor) return null
  return { variante: melhor.variante, cr: melhor.cr, lift: ((melhor.cr - crControle) / crControle) * 100 }
}

function rpvDe(t: TesteAB): number | null {
  const referencia = t.variantes_teste?.find(v => v.is_vencedor) ?? t.variantes_teste?.find(v => v.is_controle)
  if (!referencia || !referencia.sessoes) return null
  return (referencia.receita ?? 0) / referencia.sessoes
}

function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function diasEntre(dataInicio?: string | null, dataFim?: string | null): number | null {
  if (!dataInicio) return null
  const fim = dataFim ? new Date(dataFim) : new Date()
  const inicio = new Date(dataInicio)
  return Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 86400000))
}

function formatarData(data?: string | null): string | null {
  if (!data) return null
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function cvrControle(t: TesteAB): number | null {
  const controle = t.variantes_teste?.find(v => v.is_controle)
  if (!controle || !controle.sessoes) return null
  return taxaConversao(controle.sessoes, controle.conversoes ?? 0)
}

function unicos<T>(lista: (T | null | undefined)[]): T[] {
  return Array.from(new Set(lista.filter((v): v is T => v !== null && v !== undefined && v !== ''))).sort()
}

interface Props {
  testes: TesteAB[]
  funis: Pick<Funil, 'id' | 'id_funil' | 'nome' | 'status'>[]
}

function LinhaMetricasVariante({
  variante, testeId, tipoTeste, onSalvo,
}: {
  variante: Variante
  testeId: string
  tipoTeste?: string | null
  onSalvo: (valores: Metricas) => void
}) {
  const original: Metricas = {
    sessoes: variante.sessoes ?? 0,
    conversoes: variante.conversoes ?? 0,
    receita: variante.receita ?? 0,
    sessoes_checkout: variante.sessoes_checkout ?? 0,
  }
  const [valores, setValores] = useState(original)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const sujo = JSON.stringify(valores) !== JSON.stringify(original)

  async function salvar() {
    setSalvando(true)
    const r = await atualizarMetricasVariante({ id: variante.id, teste_id: testeId, ...valores })
    setSalvando(false)
    if (r.ok) {
      onSalvo(valores)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 1500)
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500'
  const mostrarVendas = tipoTeste !== 'aquisicao'

  function campo(label: string, chave: keyof Metricas) {
    return (
      <div>
        <label className="text-[10px] text-gray-500 uppercase">{label}</label>
        <input
          type="number" className={inputCls} placeholder="0"
          value={valores[chave] === 0 ? '' : valores[chave]}
          onChange={e => setValores(v => ({ ...v, [chave]: e.target.value === '' ? 0 : Number(e.target.value) }))}
          onFocus={e => e.target.select()}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); salvar() } }}
        />
      </div>
    )
  }

  return (
    <div className={`grid ${mostrarVendas ? 'grid-cols-6' : 'grid-cols-4'} gap-3 items-end py-2`}>
      <div>
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          {variante.is_controle && <span className="text-gray-600">●</span>} {variante.nome}
        </p>
      </div>
      {campo('Sessões', 'sessoes')}
      {mostrarVendas && campo('Início Checkout', 'sessoes_checkout')}
      {campo('Conversões', 'conversoes')}
      {mostrarVendas && campo('Receita', 'receita')}
      <div className="flex items-center h-[34px]">
        {sujo && (
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        )}
        {!sujo && salvo && (
          <span className="flex items-center gap-1 text-xs text-green-400"><Check size={14} /> Salvo</span>
        )}
      </div>
    </div>
  )
}

export function ListaVariantes({ testes: testesProp, funis }: Props) {
  const [testes, setTestes] = useState(testesProp)
  useEffect(() => setTestes(testesProp), [testesProp])

  function atualizarMetricasLocais(testeId: string, varianteId: string, valores: Metricas) {
    setTestes(prev => prev.map(t => t.id !== testeId ? t : {
      ...t,
      variantes_teste: t.variantes_teste?.map(v => v.id !== varianteId ? v : { ...v, ...valores }),
    }))
  }

  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  async function handleExcluir(testeId: string) {
    setExcluindo(testeId)
    const r = await deletarTesteAB(testeId)
    setExcluindo(null)
    setConfirmandoExclusao(null)
    if (r.ok) setTestes(prev => prev.filter(t => t.id !== testeId))
  }

  const [tipoAtivo, setTipoAtivo] = useState<'todos' | 'aquisicao' | 'vendas'>('todos')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState('')
  const [filtroFunil, setFiltroFunil] = useState('__all__')
  const [filtroStatus, setFiltroStatus] = useState('__all__')
  const [filtroEspecialista, setFiltroEspecialista] = useState('__all__')
  const [filtroSegmento, setFiltroSegmento] = useState('__all__')
  const [filtroCampanha, setFiltroCampanha] = useState('__all__')
  const [filtroResponsavel, setFiltroResponsavel] = useState('__all__')
  const [filtroElemento, setFiltroElemento] = useState('__all__')
  const [filtroAngulo, setFiltroAngulo] = useState('__all__')
  const [filtroPeriodo, setFiltroPeriodo] = useState('__all__')

  const especialistasOpcoes = useMemo(() => unicos(testes.map(t => t.especialistas?.nome)), [testes])
  const segmentosOpcoes = useMemo(() => unicos(testes.map(t => t.segmento)), [testes])
  const campanhasOpcoes = useMemo(() => unicos(testes.map(t => t.campanhas?.codigo)), [testes])
  const responsaveisOpcoes = useMemo(() => unicos(testes.map(t => t.responsavel)), [testes])
  const elementosOpcoes = useMemo(() => unicos(testes.map(t => t.elemento_testado)), [testes])
  const angulosOpcoes = useMemo(() => unicos(testes.flatMap(t => t.angulos ?? [])), [testes])

  const testesPorTipo = useMemo(
    () => (tipoAtivo === 'todos' ? testes : testes.filter(t => t.tipo_teste === tipoAtivo)),
    [testes, tipoAtivo]
  )

  const filtrados = useMemo(() => testesPorTipo.filter(t => {
    if (busca.trim()) {
      const alvo = `${t.nome} ${t.codigo ?? ''}`.toLowerCase()
      if (!alvo.includes(busca.trim().toLowerCase())) return false
    }
    if (filtroFunil !== '__all__' && t.funil_id !== filtroFunil) return false
    if (filtroStatus !== '__all__' && t.status !== filtroStatus) return false
    if (filtroEspecialista !== '__all__' && t.especialistas?.nome !== filtroEspecialista) return false
    if (filtroSegmento !== '__all__' && t.segmento !== filtroSegmento) return false
    if (filtroCampanha !== '__all__' && t.campanhas?.codigo !== filtroCampanha) return false
    if (filtroResponsavel !== '__all__' && t.responsavel !== filtroResponsavel) return false
    if (filtroElemento !== '__all__' && t.elemento_testado !== filtroElemento) return false
    if (filtroAngulo !== '__all__' && !(t.angulos ?? []).includes(filtroAngulo)) return false
    if (filtroPeriodo !== '__all__') {
      const limite = new Date()
      limite.setDate(limite.getDate() - Number(filtroPeriodo))
      if (new Date(t.criado_em) < limite) return false
    }
    return true
  }), [
    testesPorTipo, busca, filtroFunil, filtroStatus, filtroEspecialista, filtroSegmento,
    filtroCampanha, filtroResponsavel, filtroElemento, filtroAngulo, filtroPeriodo,
  ])

  const totalAtivos = testesPorTipo.filter(t => t.status === 'Ativo').length
  const funisAtivos = funis.filter(f => f.status === 'Ativo')
  const funisComTesteAtivo = new Set(testesPorTipo.filter(t => t.status === 'Ativo').map(t => t.funil_id))
  const funisAtivosComTeste = funisAtivos.filter(f => funisComTesteAtivo.has(f.id)).length
  const vencedoresDeclarados = testesPorTipo.filter(t => t.variantes_teste?.some(v => v.is_vencedor)).length

  const selectCls = 'bg-gray-900 border-gray-800 text-white focus:ring-0 focus:ring-offset-0 h-9 text-sm'
  const itemCls = 'text-gray-300 focus:bg-gray-800 focus:text-white'

  function toggleExpandido(id: string) {
    setExpandidos(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id); else novo.add(id)
      return novo
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Experimentos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{testes.length} experimento{testes.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/variantes/novo">
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus size={16} /> Novo experimento
          </button>
        </Link>
      </div>

      {testes.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-12 text-center space-y-3">
          <FlaskConical size={28} className="text-gray-700 mx-auto" />
          <p className="text-gray-400">Nenhum experimento criado ainda.</p>
          <Link href="/variantes/novo" className="text-indigo-400 hover:underline text-sm">
            Criar o primeiro teste A/B
          </Link>
        </div>
      ) : (
        <>
          {/* Toggle Aquisição / Vendas / Todos */}
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

          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Testes Ativos</p>
              <p className="text-white text-2xl font-bold">{totalAtivos}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Funis com Testes</p>
              <p className="text-white text-2xl font-bold">
                {funisAtivosComTeste}<span className="text-gray-500 text-base font-normal">/{funisAtivos.length} Ativos</span>
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Vencedores Declarados</p>
              <p className="text-white text-2xl font-bold">{vencedoresDeclarados}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-56 h-9 pl-8 pr-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <Select value={filtroFunil} onValueChange={setFiltroFunil}>
              <SelectTrigger className={`w-44 ${selectCls}`}><SelectValue placeholder="Funil" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos os funis</SelectItem>
                {funis.map(f => <SelectItem key={f.id} value={f.id} className={itemCls}>{f.id_funil ? `[${f.id_funil}] ` : ''}{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroEspecialista} onValueChange={setFiltroEspecialista}>
              <SelectTrigger className={`w-48 ${selectCls}`}><SelectValue placeholder="Especialista" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos especialistas</SelectItem>
                {especialistasOpcoes.map(e => <SelectItem key={e} value={e} className={itemCls}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger className={`w-44 ${selectCls}`}><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos responsáveis</SelectItem>
                {responsaveisOpcoes.map(r => <SelectItem key={r} value={r} className={itemCls}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
              <SelectTrigger className={`w-40 ${selectCls}`}><SelectValue placeholder="Segmento" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos segmentos</SelectItem>
                {segmentosOpcoes.map(s => <SelectItem key={s} value={s} className={itemCls}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroCampanha} onValueChange={setFiltroCampanha}>
              <SelectTrigger className={`w-40 ${selectCls}`}><SelectValue placeholder="Campanha" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todas campanhas</SelectItem>
                {campanhasOpcoes.map(c => <SelectItem key={c} value={c} className={itemCls}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroElemento} onValueChange={setFiltroElemento}>
              <SelectTrigger className={`w-44 ${selectCls}`}><SelectValue placeholder="Elemento" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos elementos</SelectItem>
                {elementosOpcoes.map(e => <SelectItem key={e} value={e} className={itemCls}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroAngulo} onValueChange={setFiltroAngulo}>
              <SelectTrigger className={`w-40 ${selectCls}`}><SelectValue placeholder="Ângulo" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos ângulos</SelectItem>
                {angulosOpcoes.map(a => <SelectItem key={a} value={a} className={itemCls}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className={`w-40 ${selectCls}`}><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos os status</SelectItem>
                {STATUS_OPCOES.map(s => <SelectItem key={s} value={s} className={itemCls}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger className={`w-40 ${selectCls}`}><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                {PERIODOS.map(p => <SelectItem key={p.valor} value={p.valor} className={itemCls}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filtrados.length === 0 ? (
            <div className="rounded-xl border border-gray-800 p-12 text-center">
              <p className="text-gray-500 text-sm">Nenhum experimento encontrado com esses filtros.</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1180px]">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="w-8 px-2 py-3"></th>
                    <th className="px-4 py-3 font-medium">Experimento</th>
                    <th className="px-4 py-3 font-medium">Contexto</th>
                    <th className="px-4 py-3 font-medium">Segmentação</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Variações</th>
                    <th className="px-4 py-3 font-medium">Resultado</th>
                    <th className="px-4 py-3 font-medium text-right">Métrica / RPV</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-800">
                  {filtrados.map(t => {
                    const lift = liftDaVencedora(t)
                    const rpv = rpvDe(t)
                    const dias = diasEntre(t.data_inicio, t.data_fim)
                    const inicio = formatarData(t.data_inicio)
                    const cvr = cvrControle(t)
                    const vencedora = t.variantes_teste?.find(v => v.is_vencedor)
                    const lider = !vencedora ? liderAtual(t) : null
                    const angulosDoTeste = t.angulos ?? []
                    const expandido = expandidos.has(t.id)
                    return (
                      <Fragment key={t.id}>
                      <tr className="hover:bg-gray-900/40 transition-colors align-top">
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => toggleExpandido(t.id)}
                            className="text-gray-600 hover:text-white transition-colors"
                            title="Editar métricas das variantes"
                          >
                            {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        {/* Experimento: nome + código + ângulos */}
                        <td className="px-4 py-3">
                          <Link href={`/variantes/${t.id}`} className="text-white font-medium hover:text-indigo-400 transition-colors">
                            {t.nome}
                          </Link>
                          <p className="text-gray-600 text-xs font-mono mt-0.5">{t.codigo ?? '—'}</p>
                          {angulosDoTeste.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {angulosDoTeste.slice(0, 2).map(a => (
                                <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{a}</span>
                              ))}
                              {angulosDoTeste.length > 2 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">+{angulosDoTeste.length - 2}</span>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Contexto: funil + especialista/responsável */}
                        <td className="px-4 py-3 text-gray-400">
                          <p>
                            {t.funis?.id_funil && <span className="text-indigo-400 font-mono text-xs mr-1">[{t.funis.id_funil}]</span>}
                            {t.funis?.nome ?? '—'}
                          </p>
                          <p className="text-gray-600 text-xs mt-0.5">
                            {[t.especialistas?.nome, t.responsavel].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </td>
                        {/* Segmentação: tipo + segmento + campanha */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.tipo_teste && (
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COR[t.tipo_teste] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                {TIPO_LABEL[t.tipo_teste] ?? t.tipo_teste}
                              </span>
                            )}
                            {t.segmento && (
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${SEGMENTO_COR[t.segmento] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                {t.segmento}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs mt-1">{t.campanhas?.codigo ?? '—'}</p>
                        </td>
                        {/* Status + duração */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COR[t.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                            {t.status}
                          </span>
                          <p className="text-gray-600 text-xs mt-1">
                            {inicio ? `Início ${inicio}` : '—'}
                            {dias !== null && ` · ${dias}d`}
                          </p>
                        </td>
                        {/* Variações: count + elemento testado */}
                        <td className="px-4 py-3 text-gray-400">
                          <p>{t.variantes_teste?.length ?? 0} variantes</p>
                          <p className="text-gray-600 text-xs mt-0.5">{t.elemento_testado ?? '—'}</p>
                        </td>
                        {/* Resultado: vencedora + lift */}
                        <td className="px-4 py-3">
                          {vencedora ? (
                            <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-medium">
                              <Trophy size={12} /> {vencedora.nome}
                              {lift !== null && cvr !== null && (
                                <span
                                  className={`inline-flex items-center gap-0.5 ${lift >= 0 ? 'text-green-400' : 'text-red-400'}`}
                                  title={`CVR Controle ${cvr.toFixed(1)}% → CVR ${vencedora.nome} ${taxaConversao(vencedora.sessoes ?? 0, vencedora.conversoes ?? 0).toFixed(1)}% (lift relativo de ${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%)`}
                                >
                                  ({lift >= 0 ? '+' : ''}{lift.toFixed(1)}%) <Info size={10} />
                                </span>
                              )}
                            </span>
                          ) : lider ? (
                            <Link href={`/variantes/${t.id}`} className="inline-flex flex-col hover:opacity-80 transition-opacity">
                              <span className="inline-flex items-center gap-1 text-indigo-400 text-xs font-medium">
                                {lider.variante.nome} lidera
                                <span
                                  className={`inline-flex items-center gap-0.5 ${lider.lift >= 0 ? 'text-indigo-400' : 'text-red-400'}`}
                                  title={`CVR Controle ${cvr?.toFixed(1)}% → CVR ${lider.variante.nome} ${lider.cr.toFixed(1)}% (lift relativo de ${lider.lift >= 0 ? '+' : ''}${lider.lift.toFixed(1)}%)`}
                                >
                                  ({lider.lift >= 0 ? '+' : ''}{lider.lift.toFixed(1)}%) <Info size={10} />
                                </span>
                              </span>
                              <span className="text-gray-600 text-[10px]">ainda não declarada</span>
                            </Link>
                          ) : cvr !== null ? (
                            <Link href={`/variantes/${t.id}`} className="text-gray-500 hover:text-indigo-400 text-xs underline decoration-dotted transition-colors">
                              Sem vencedora declarada
                            </Link>
                          ) : (
                            <span className="text-gray-600 text-xs">
                              {t.status === 'Ativo' || t.status === 'Planejado' ? 'Aguardando dados...' : '—'}
                            </span>
                          )}
                        </td>
                        {/* Métrica + RPV */}
                        <td className="px-4 py-3 text-right">
                          <p className="text-gray-400 text-xs">{t.metrica_primaria ?? '—'}</p>
                          <p className="text-gray-600 text-xs mt-0.5">
                            {cvr !== null ? `CVR Controle ${cvr.toFixed(1)}%` : '—'}
                            {lider && ` · Líder ${lider.cr.toFixed(1)}%`}
                            {t.tipo_teste !== 'aquisicao' && rpv !== null && ` · RPV ${formatarMoeda(rpv)}`}
                          </p>
                        </td>
                        {/* Ações */}
                        <td className="px-4 py-3 text-right">
                          {confirmandoExclusao === t.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleExcluir(t.id)}
                                disabled={excluindo === t.id}
                                className="px-2 py-1 text-[11px] text-white bg-red-600 hover:bg-red-500 rounded font-medium disabled:opacity-50 transition-colors"
                              >
                                {excluindo === t.id ? 'Excluindo...' : 'Excluir'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmandoExclusao(null)}
                                className="px-2 py-1 text-[11px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmandoExclusao(t.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                              title="Excluir experimento"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandido && (
                        <tr className="bg-black/20">
                          <td></td>
                          <td colSpan={7} className="px-4 py-3">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Métricas por variante</p>
                            <div className="divide-y divide-gray-800/60">
                              {(t.variantes_teste ?? []).map(v => (
                                <LinhaMetricasVariante
                                  key={v.id}
                                  variante={v}
                                  testeId={t.id}
                                  tipoTeste={t.tipo_teste}
                                  onSalvo={valores => atualizarMetricasLocais(t.id, v.id, valores)}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
