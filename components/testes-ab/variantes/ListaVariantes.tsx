'use client'
import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, FlaskConical, Trophy, Search, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Check, Info,
  Trash2, Pencil, Copy, Layers, Download, ZoomIn, FileCode2, X, ExternalLink, Lightbulb,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { atualizarMetricasVariante, atualizarAprendizado, deletarTesteAB, duplicarTesteAB } from '@/lib/actions/testes-ab'
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
const STATUS_PRIORIDADE: Record<string, number> = {
  'Ativo': 0,
  'Planejado': 1,
  'Finalizado': 2,
  'Vencedor implementado': 3,
}

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

function numeroSequencial(codigo?: string | null): string | null {
  if (!codigo) return null
  const seq = codigo.split('_')[0]
  return seq ? `#${seq}` : null
}

function ehArquivoHtml(url: string): boolean {
  return /\.html?($|\?)/i.test(url)
}

async function abrirReferenciaHtml(url: string) {
  try {
    const resp = await fetch(url)
    const texto = await resp.text()
    const blobUrl = URL.createObjectURL(new Blob([texto], { type: 'text/html' }))
    window.open(blobUrl, '_blank')
  } catch {
    window.open(url, '_blank')
  }
}

// URL de ativação do teste: URL da variante sem o último segmento do path
// (que é a letra/versão da variante, ex: /a, /a-v2) — é a URL "raiz" que o
// redirecionador de split-test usa pra distribuir o tráfego entre variantes.
function urlAtivacaoDoTeste(variantes: { url_variante?: string | null }[]): string | null {
  const primeira = variantes.find(v => v.url_variante)?.url_variante
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

function slugDaUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const path = new URL(url).pathname
    const segmentos = path.split('/').filter(Boolean)
    return segmentos[segmentos.length - 1] || null
  } catch {
    return null
  }
}

const LAYOUT_LABEL: Record<string, string> = { curto: 'Curto', longo: 'Longo' }

function resumoLayout(variantes: { nome: string; layout?: string | null }[]): string | null {
  const comLayout = variantes.filter(v => v.layout)
  if (comLayout.length === 0) return null
  const valores = new Set(comLayout.map(v => v.layout))
  if (valores.size === 1) return LAYOUT_LABEL[comLayout[0].layout as string] ?? comLayout[0].layout ?? null
  return comLayout.map(v => `${v.nome.match(/([A-Za-z])$/)?.[1] ?? v.nome}: ${LAYOUT_LABEL[v.layout as string] ?? v.layout}`).join(' · ')
}

function nomeVariante(v: { nome: string; is_controle: boolean; url_variante?: string | null }): string {
  const base = v.is_controle ? `Controle (${v.nome.match(/([A-Za-z])$/)?.[1] ?? 'A'})` : v.nome
  const slug = slugDaUrl(v.url_variante)
  return slug ? `${base} (${slug})` : base
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
  initialStatus?: string
  initialTipo?: 'todos' | 'aquisicao' | 'vendas'
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

  const cvrGeral = taxaConversao(valores.sessoes, valores.conversoes)
  const cvrCheckout = taxaConversao(valores.sessoes, valores.sessoes_checkout)
  const cvrFechamento = taxaConversao(valores.sessoes_checkout, valores.conversoes)

  return (
    <div className="py-2">
    <div className={`grid ${mostrarVendas ? 'grid-cols-6' : 'grid-cols-4'} gap-3 items-end`}>
      <div>
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          {variante.is_controle && <span className="text-gray-600">●</span>} {nomeVariante(variante)}
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
    {valores.sessoes > 0 && (
      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
        <span>CVR Geral <span className="text-white font-medium">{cvrGeral.toFixed(1)}%</span></span>
        {mostrarVendas && (
          <>
            <span className="text-gray-700">·</span>
            <span>Sessão → Checkout <span className="text-gray-300 font-medium">{cvrCheckout.toFixed(1)}%</span></span>
            {valores.sessoes_checkout > 0 && (
              <>
                <span className="text-gray-700">·</span>
                <span>Checkout → Venda <span className="text-gray-300 font-medium">{cvrFechamento.toFixed(1)}%</span></span>
              </>
            )}
          </>
        )}
      </div>
    )}
    </div>
  )
}

function CampoAprendizadoRapido({
  testeId, resultado, onSalvo,
}: {
  testeId: string
  resultado?: string | null
  onSalvo: (valor: string) => void
}) {
  const original = resultado ?? ''
  const [valor, setValor] = useState(original)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (valor === original) return
    setSalvando(true)
    const r = await atualizarAprendizado(testeId, valor)
    setSalvando(false)
    if (r.ok) onSalvo(valor)
  }

  return (
    <div className="mb-3 max-w-2xl">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
        <Lightbulb size={11} className="text-amber-400" /> Aprendizado
      </p>
      <Textarea
        value={valor}
        onChange={e => setValor(e.target.value)}
        onBlur={salvar}
        placeholder="O que esse teste ensinou? Registre aqui — esse campo é seu, não é gerado automaticamente."
        rows={2}
        className="w-full bg-gray-900/60 border border-gray-800 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 resize-none min-h-0"
      />
      {salvando && <p className="text-gray-600 text-[11px] mt-1">Salvando...</p>}
    </div>
  )
}

export function ListaVariantes({ testes: testesProp, funis, initialStatus, initialTipo }: Props) {
  const router = useRouter()
  const [testes, setTestes] = useState(testesProp)
  useEffect(() => setTestes(testesProp), [testesProp])

  function atualizarMetricasLocais(testeId: string, varianteId: string, valores: Metricas) {
    setTestes(prev => prev.map(t => t.id !== testeId ? t : {
      ...t,
      variantes_teste: t.variantes_teste?.map(v => v.id !== varianteId ? v : { ...v, ...valores }),
    }))
  }

  function atualizarAprendizadoLocal(testeId: string, valor: string) {
    setTestes(prev => prev.map(t => t.id !== testeId ? t : { ...t, resultado: valor }))
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

  const [duplicando, setDuplicando] = useState<string | null>(null)

  async function handleDuplicar(testeId: string) {
    setDuplicando(testeId)
    const r = await duplicarTesteAB(testeId)
    setDuplicando(null)
    if (r.ok && r.id) router.push(`/variantes/${r.id}/editar`)
  }

  const [tipoAtivo, setTipoAtivo] = useState<'todos' | 'aquisicao' | 'vendas'>(initialTipo ?? 'todos')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroFunil, setFiltroFunil] = useState('__all__')
  const [filtroStatus, setFiltroStatus] = useState(initialStatus ?? '__all__')
  const [filtroEspecialista, setFiltroEspecialista] = useState('__all__')
  const [filtroSegmento, setFiltroSegmento] = useState('__all__')
  const [filtroCampanha, setFiltroCampanha] = useState('__all__')
  const [filtroResponsavel, setFiltroResponsavel] = useState('__all__')
  const [filtroElemento, setFiltroElemento] = useState('__all__')
  const [filtroAngulo, setFiltroAngulo] = useState('__all__')
  const [filtroLayout, setFiltroLayout] = useState('__all__')
  const [filtroPeriodo, setFiltroPeriodo] = useState('__all__')

  const especialistasOpcoes = useMemo(() => unicos(testes.map(t => t.especialistas?.nome)), [testes])
  const segmentosOpcoes = useMemo(() => unicos(testes.map(t => t.segmento)), [testes])
  const campanhasOpcoes = useMemo(() => unicos(testes.map(t => t.campanhas?.codigo)), [testes])
  const responsaveisOpcoes = useMemo(() => unicos(testes.map(t => t.responsavel)), [testes])
  const elementosOpcoes = useMemo(() => unicos(testes.map(t => t.elemento_testado)), [testes])
  const angulosOpcoes = useMemo(() => unicos(testes.flatMap(t => t.angulos ?? [])), [testes])
  const layoutsOpcoes = useMemo(() => unicos(testes.flatMap(t => t.variantes_teste?.map(v => v.layout) ?? [])), [testes])

  const testesPorTipo = useMemo(
    () => (tipoAtivo === 'todos' ? testes : testes.filter(t => t.tipo_teste === tipoAtivo)),
    [testes, tipoAtivo]
  )

  const filtradosBase = useMemo(() => testesPorTipo.filter(t => {
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
    if (filtroLayout !== '__all__' && !(t.variantes_teste ?? []).some(v => v.layout === filtroLayout)) return false
    if (filtroPeriodo !== '__all__') {
      const limite = new Date()
      limite.setDate(limite.getDate() - Number(filtroPeriodo))
      if (new Date(t.criado_em) < limite) return false
    }
    return true
  }), [
    testesPorTipo, busca, filtroFunil, filtroStatus, filtroEspecialista, filtroSegmento,
    filtroCampanha, filtroResponsavel, filtroElemento, filtroAngulo, filtroLayout, filtroPeriodo,
  ])

  type CampoOrdenacao = 'nome' | 'status' | 'resultado'
  const [ordenacao, setOrdenacao] = useState<{ campo: CampoOrdenacao; direcao: 'asc' | 'desc' } | null>(null)

  function valorOrdenacao(t: TesteAB, campo: CampoOrdenacao): string | number | null {
    switch (campo) {
      case 'nome': return t.nome.toLowerCase()
      case 'status': return STATUS_PRIORIDADE[t.status] ?? 99
      case 'resultado': return liftDaVencedora(t) ?? liderAtual(t)?.lift ?? null
    }
  }

  function direcaoPadrao(campo: CampoOrdenacao): 'asc' | 'desc' {
    return campo === 'resultado' ? 'desc' : 'asc'
  }

  function toggleOrdenacao(campo: CampoOrdenacao) {
    setOrdenacao(prev => {
      if (!prev || prev.campo !== campo) return { campo, direcao: direcaoPadrao(campo) }
      if (prev.direcao === direcaoPadrao(campo)) return { campo, direcao: direcaoPadrao(campo) === 'asc' ? 'desc' : 'asc' }
      return null
    })
  }

  const filtrados = useMemo(() => {
    if (!ordenacao) return filtradosBase
    const { campo, direcao } = ordenacao
    const comValor: TesteAB[] = []
    const semValor: TesteAB[] = []
    for (const t of filtradosBase) {
      (valorOrdenacao(t, campo) === null ? semValor : comValor).push(t)
    }
    comValor.sort((a, b) => {
      const va = valorOrdenacao(a, campo) as string | number
      const vb = valorOrdenacao(b, campo) as string | number
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return direcao === 'asc' ? cmp : -cmp
    })
    return [...comValor, ...semValor]
  }, [filtradosBase, ordenacao])

  const ITENS_POR_PAGINA = 30
  const [paginaAtual, setPaginaAtual] = useState(1)
  useEffect(() => setPaginaAtual(1), [tipoAtivo, busca, filtroFunil, filtroStatus, filtroEspecialista, filtroSegmento, filtroCampanha, filtroResponsavel, filtroElemento, filtroAngulo, filtroLayout, filtroPeriodo, ordenacao])

  const visiveis = useMemo(() => filtrados.slice(0, paginaAtual * ITENS_POR_PAGINA), [filtrados, paginaAtual])

  // Agrupar por funil só compensa quando há volume real — com poucos testes só
  // atrapalha (obriga clicar pra ver o que já cabia direto na tela).
  const LIMIAR_AGRUPAMENTO = 15
  const usarAgrupamento = filtrados.length > LIMIAR_AGRUPAMENTO

  const [gruposColapsados, setGruposColapsados] = useState<Set<string>>(new Set())
  function toggleGrupo(funilId: string) {
    setGruposColapsados(prev => {
      const novo = new Set(prev)
      if (novo.has(funilId)) novo.delete(funilId); else novo.add(funilId)
      return novo
    })
  }

  const grupos = useMemo(() => {
    if (!usarAgrupamento) return [{ funilId: '__flat__', nome: '', idFunil: null as string | null, testes: visiveis }]
    const porFunil = new Map<string, TesteAB[]>()
    for (const t of visiveis) {
      const lista = porFunil.get(t.funil_id) ?? []
      lista.push(t)
      porFunil.set(t.funil_id, lista)
    }
    return Array.from(porFunil.entries())
      .map(([funilId, lista]) => ({
        funilId,
        nome: lista[0]?.funis?.nome ?? 'Sem funil',
        idFunil: lista[0]?.funis?.id_funil ?? null,
        testes: lista,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [visiveis])

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

  function ThOrdenavel({ campo, children }: { campo: CampoOrdenacao; children: React.ReactNode }) {
    const ativo = ordenacao?.campo === campo
    return (
      <th className="px-4 py-3 font-medium">
        <button
          type="button"
          onClick={() => toggleOrdenacao(campo)}
          className={`flex items-center gap-1 transition-colors ${ativo ? 'text-white' : 'hover:text-white'}`}
        >
          {children}
          {ativo
            ? (ordenacao!.direcao === 'asc' ? <ChevronUp size={12} className="text-indigo-400" /> : <ChevronDown size={12} className="text-indigo-400" />)
            : <ChevronsUpDown size={12} className="text-gray-700" />}
        </button>
      </th>
    )
  }

  function exportarCSV() {
    const cabecalho = [
      'Nome', 'Código', 'Funil', 'Campanha', 'Elemento', 'Ângulos', 'Layout', 'Tipo', 'Segmento',
      'Status', 'Início', 'Dias rodando', 'CVR Controle (%)', 'Resultado', 'Lift (%)', 'RPV',
      'Especialista', 'Responsável',
    ]
    const linhas = filtrados.map(t => {
      const lift = liftDaVencedora(t)
      const rpv = rpvDe(t)
      const cvr = cvrControle(t)
      const vencedora = t.variantes_teste?.find(v => v.is_vencedor)
      const lider = !vencedora ? liderAtual(t) : null
      const dias = diasEntre(t.data_inicio, t.data_fim)
      return [
        t.nome,
        t.codigo ?? '',
        t.funis?.nome ?? '',
        t.campanhas?.codigo ?? '',
        t.elemento_testado ?? '',
        (t.angulos ?? []).join('; '),
        resumoLayout(t.variantes_teste ?? []) ?? '',
        t.tipo_teste ? (TIPO_LABEL[t.tipo_teste] ?? t.tipo_teste) : '',
        t.segmento ?? '',
        t.status,
        formatarData(t.data_inicio) ?? '',
        dias !== null ? String(dias) : '',
        cvr !== null ? cvr.toFixed(1) : '',
        vencedora ? `Vencedora: ${vencedora.nome}` : lider ? `Líder: ${lider.variante.nome}` : '',
        lift !== null ? lift.toFixed(1) : lider ? lider.lift.toFixed(1) : '',
        rpv !== null ? rpv.toFixed(2) : '',
        t.especialistas?.nome ?? '',
        t.responsavel ?? '',
      ]
    })
    const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [cabecalho, ...linhas].map(linha => linha.map(escapar).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `experimentos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Experimentos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{testes.length} experimento{testes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            title="Exporta os experimentos filtrados na tela"
          >
            <Download size={16} /> Exportar CSV
          </button>
          <Link href="/variantes/novo">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Plus size={16} /> Novo experimento
            </button>
          </Link>
        </div>
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
            <Select value={filtroLayout} onValueChange={setFiltroLayout}>
              <SelectTrigger className={`w-36 ${selectCls}`}><SelectValue placeholder="Layout" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__all__" className={itemCls}>Todos layouts</SelectItem>
                {layoutsOpcoes.map(l => <SelectItem key={l} value={l} className={itemCls}>{LAYOUT_LABEL[l] ?? l}</SelectItem>)}
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
              <table className="w-full text-left border-collapse min-w-[1560px]">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="w-8 px-2 py-3"></th>
                    <ThOrdenavel campo="nome">Experimento</ThOrdenavel>
                    <th className="px-4 py-3 font-medium">Funil</th>
                    <th className="px-4 py-3 font-medium">Campanha</th>
                    <th className="px-4 py-3 font-medium">Elemento</th>
                    <th className="px-4 py-3 font-medium">Ângulos da Hero</th>
                    <th className="px-4 py-3 font-medium">Layout</th>
                    <th className="px-4 py-3 font-medium">Segmentação</th>
                    <ThOrdenavel campo="status">Status</ThOrdenavel>
                    <ThOrdenavel campo="resultado">Resultado</ThOrdenavel>
                    <th className="px-4 py-3 font-medium text-right">Métrica / RPV</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-800">
                  {grupos.map(grupo => (
                    <Fragment key={grupo.funilId}>
                      {usarAgrupamento && (
                        <tr className="bg-gray-900/60">
                          <td colSpan={12} className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => toggleGrupo(grupo.funilId)}
                              className="flex items-center gap-2 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
                            >
                              {gruposColapsados.has(grupo.funilId) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                              <Layers size={12} />
                              {grupo.idFunil && <span className="font-mono text-indigo-400">[{grupo.idFunil}]</span>}
                              {grupo.nome}
                              <span className="text-gray-600 font-normal">· {grupo.testes.length} experimento{grupo.testes.length !== 1 ? 's' : ''}</span>
                            </button>
                          </td>
                        </tr>
                      )}
                      {(!usarAgrupamento || !gruposColapsados.has(grupo.funilId)) && grupo.testes.map(t => {
                    const lift = liftDaVencedora(t)
                    const rpv = rpvDe(t)
                    const dias = diasEntre(t.data_inicio, t.data_fim)
                    const inicio = formatarData(t.data_inicio)
                    const cvr = cvrControle(t)
                    const vencedora = t.variantes_teste?.find(v => v.is_vencedor)
                    const lider = !vencedora ? liderAtual(t) : null
                    const angulosDoTeste = t.angulos ?? []
                    const layoutResumo = resumoLayout(t.variantes_teste ?? [])
                    const urlAtivacao = t.url_ativacao || urlAtivacaoDoTeste(t.variantes_teste ?? [])
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
                        {/* Experimento: nome + código + hipótese resumida */}
                        <td className="px-4 py-3 max-w-[260px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link href={`/variantes/${t.id}`} className="text-white font-medium hover:text-indigo-400 transition-colors">
                              {t.nome}
                            </Link>
                            <span className="text-gray-600 text-xs font-mono">{numeroSequencial(t.codigo) ?? '—'}</span>
                          </div>
                          {t.hipotese && (
                            <p className="text-gray-500 text-xs truncate mt-0.5" title={t.hipotese}>{t.hipotese}</p>
                          )}
                        </td>
                        {/* Funil */}
                        <td className="px-4 py-3">
                          {t.funis ? (
                            <span className="text-xs text-gray-300">
                              {t.funis.id_funil && <span className="font-mono text-gray-500 mr-1">[{t.funis.id_funil}]</span>}
                              {t.funis.nome}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Campanha */}
                        <td className="px-4 py-3">
                          {t.campanhas?.codigo ? (
                            <span className="text-xs text-gray-300 whitespace-nowrap">{t.campanhas.codigo}</span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Elemento testado */}
                        <td className="px-4 py-3">
                          {t.elemento_testado ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 whitespace-nowrap">
                              {t.elemento_testado}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Ângulos da Hero */}
                        <td className="px-4 py-3">
                          {angulosDoTeste.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                              {angulosDoTeste.map(a => (
                                <span key={a} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">{a}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Layout */}
                        <td className="px-4 py-3">
                          {layoutResumo ? (
                            <span className="text-xs text-gray-400 whitespace-nowrap">{layoutResumo}</span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Segmentação: tipo + segmento */}
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
                            {!t.tipo_teste && !t.segmento && <span className="text-gray-600 text-xs">—</span>}
                          </div>
                        </td>
                        {/* Status + duração */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COR[t.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}
                            title={inicio ? `Início ${inicio}` : undefined}
                          >
                            {t.status}
                          </span>
                          {dias !== null && <span className="text-gray-600 text-xs ml-1.5">{dias}d</span>}
                        </td>
                        {/* Resultado: vencedora + lift */}
                        <td className="px-4 py-3">
                          {t.resultado_final === 'sem_vencedor' ? (
                            <Link href={`/variantes/${t.id}`} className="text-gray-400 hover:text-gray-300 text-xs transition-colors">
                              Encerrado sem vencedor <span className="text-gray-600">(empate/inconclusivo)</span>
                            </Link>
                          ) : vencedora ? (
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
                        <td className="px-4 py-3 text-right" title={t.metrica_primaria ?? undefined}>
                          <p className="text-gray-400 text-xs">
                            {cvr !== null ? `CVR ${cvr.toFixed(1)}%` : '—'}
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
                            <div className="flex items-center justify-end gap-2.5">
                              {urlAtivacao && (
                                <a
                                  href={urlAtivacao}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-indigo-400 transition-colors"
                                  title={`Acessar URL de ativação do teste (${urlAtivacao})`}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                              <Link
                                href={`/variantes/${t.id}/editar`}
                                className="text-gray-600 hover:text-indigo-400 transition-colors"
                                title="Editar experimento"
                              >
                                <Pencil size={14} />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDuplicar(t.id)}
                                disabled={duplicando === t.id}
                                className="text-gray-600 hover:text-indigo-400 transition-colors disabled:opacity-50"
                                title="Duplicar experimento"
                              >
                                <Copy size={14} className={duplicando === t.id ? 'animate-pulse' : ''} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmandoExclusao(t.id)}
                                className="text-gray-600 hover:text-red-400 transition-colors"
                                title="Excluir experimento"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandido && (
                        <tr className="bg-black/20">
                          <td></td>
                          <td colSpan={11} className="px-4 py-3">
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 mb-3 pb-3 border-b border-gray-800/60">
                              <span><span className="text-gray-600">Início:</span> {inicio ?? '—'}</span>
                              <span><span className="text-gray-600">Especialista:</span> {t.especialistas?.nome ?? '—'}</span>
                              <span><span className="text-gray-600">Responsável:</span> {t.responsavel ?? '—'}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Variantes</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-800/60">
                              {(t.variantes_teste ?? []).map(v => (
                                <div key={v.id} className={`flex gap-3 bg-gray-900/60 border rounded-lg p-3 ${v.is_vencedor ? 'border-green-500/40' : 'border-gray-800'}`}>
                                  {v.screenshot_url && ehArquivoHtml(v.screenshot_url) ? (
                                    <button
                                      type="button"
                                      onClick={() => abrirReferenciaHtml(v.screenshot_url!)}
                                      className="shrink-0 w-20 h-14 rounded border border-dashed border-gray-700 bg-gray-950 flex items-center justify-center text-indigo-400 hover:border-indigo-500/40 transition-colors"
                                      title="Abrir referência HTML"
                                    >
                                      <FileCode2 size={16} />
                                    </button>
                                  ) : v.screenshot_url ? (
                                    <button
                                      type="button"
                                      onClick={() => setImagemAmpliada(v.screenshot_url!)}
                                      className="relative shrink-0 w-20 h-14 group"
                                      title="Ampliar screenshot"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={v.screenshot_url} alt={nomeVariante(v)} className="w-full h-full object-cover rounded border border-gray-800" />
                                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded transition-colors">
                                        <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="shrink-0 w-20 h-14 rounded border border-dashed border-gray-800 bg-gray-950" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1.5 flex-wrap">
                                      {v.is_controle && <span className="text-gray-600">●</span>} {nomeVariante(v)}
                                      {v.layout && <span className="text-[10px] text-gray-600">· {LAYOUT_LABEL[v.layout] ?? v.layout}</span>}
                                      {v.is_vencedor && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">
                                          <Trophy size={11} /> WINNER
                                        </span>
                                      )}
                                    </p>
                                    {v.headline ? (
                                      <p className="text-sm text-white leading-snug truncate">{v.headline}</p>
                                    ) : (
                                      <p className="text-xs text-gray-600 italic">Sem headline registrada</p>
                                    )}
                                    {v.subheadline && <p className="text-xs text-gray-500 leading-snug truncate">{v.subheadline}</p>}
                                    <div className="flex items-center gap-3 mt-0.5">
                                      {v.url_variante && (
                                        <a
                                          href={v.url_variante}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-400 text-[11px] hover:underline inline-flex items-center gap-1"
                                        >
                                          <ExternalLink size={10} /> Abrir página
                                        </a>
                                      )}
                                      {v.url_preview && (
                                        <a href={v.url_preview} target="_blank" rel="noreferrer" className="text-gray-500 text-[11px] hover:underline hover:text-gray-400">
                                          Preview ↗
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <CampoAprendizadoRapido
                              testeId={t.id}
                              resultado={t.resultado}
                              onSalvo={valor => atualizarAprendizadoLocal(t.id, valor)}
                            />
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
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {visiveis.length < filtrados.length && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setPaginaAtual(p => p + 1)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg transition-colors"
              >
                Carregar mais ({filtrados.length - visiveis.length} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setImagemAmpliada(null)}
        >
          <button
            type="button"
            onClick={() => setImagemAmpliada(null)}
            className="absolute top-5 right-5 p-2 bg-gray-900/80 hover:bg-gray-800 rounded-lg text-white transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagemAmpliada}
            alt="Screenshot ampliado"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
