'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, Info, Brain, Rocket, Trash2, Upload,
  PlusCircle, SplitSquareHorizontal, MousePointerClick, Loader2, ImageOff,
  CheckCircle2, Circle, ClipboardCheck, FileCode2, ZoomIn, X, AlertTriangle, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarTesteAB, atualizarTesteAB, criarUploadAssinado } from '@/lib/actions/testes-ab'
import { criarConfiguracao } from '@/lib/actions/configuracoes'
import { createClient } from '@/lib/supabase/client'
import { iconeAngulo } from '@/lib/angulos-hero'
import type { Funil, Pagina, Especialista, Campanha, Produto, TesteAB } from '@/lib/types'

const BUCKET_SCREENSHOTS = 'teste-ab-screenshots'

interface Variante {
  id?: string
  letra: string
  paginaId: string
  urlVariante: string
  urlPreview: string
  headline: string
  subheadline: string
  layout: string
  screenshotUrl: string
  enviando: boolean
  percentual: number
  anguloDominante: string
  angulosSecundarios: string[]
}

interface Props {
  funis: (Pick<Funil, 'id' | 'id_funil' | 'nome' | 'objetivo' | 'especialista_id' | 'produto_id'> & {
    produtos?: Pick<Produto, 'especialista_id'> | null
  })[]
  metricasVendas: string[]
  metricasAquisicao: string[]
  paginas: Pick<Pagina, 'id' | 'funil_id' | 'produto_id' | 'nome' | 'codigo' | 'etapa' | 'url_pagina'>[]
  especialistas: Pick<Especialista, 'id' | 'nome'>[]
  campanhas: Pick<Campanha, 'id' | 'codigo'>[]
  segmentos: string[]
  responsaveis: string[]
  angulos: string[]
  elementosTestados: string[]
  secoesPagina: string[]
  testesExistentes: { funil_id: string; segmento: string | null }[]
  paginasEmTesteAtivo?: { pagina_id: string; teste_id: string; teste_nome: string }[]
  testeParaEditar?: TesteAB
}

const MAX_ANGULOS = 3
const LIMITE_HIPOTESE = 200

const LETRAS = ['A', 'B', 'C', 'D']
const LAYOUTS = [
  { valor: 'curto', label: 'Curto' },
  { valor: 'longo', label: 'Longo' },
]
const NOVA_CAMPANHA = '__nova__'
const NOVO_ELEMENTO = '__novo_elemento__'
const NOVA_SECAO = '__nova_secao__'

const SECOES = [
  { id: 'basicas',   label: 'Informações Básicas', icon: Info },
  { id: 'hipotese',  label: 'Hipótese',             icon: Brain },
  { id: 'variacoes', label: 'Variações',            icon: SplitSquareHorizontal },
  { id: 'metricas',  label: 'Métricas',             icon: MousePointerClick },
  { id: 'revisao',   label: 'Revisão',              icon: ClipboardCheck },
] as const

function varianteVazia(letra: string): Variante {
  return {
    letra, paginaId: '', urlVariante: '', urlPreview: '', headline: '', subheadline: '', layout: '', screenshotUrl: '',
    enviando: false, percentual: 0, anguloDominante: '', angulosSecundarios: [],
  }
}

function redistribuir(lista: Variante[]): Variante[] {
  const pct = Math.round((100 / lista.length) * 10) / 10
  const arr = lista.map(v => ({ ...v, percentual: pct }))
  const resto = Math.round((100 - arr.reduce((s, v) => s + v.percentual, 0)) * 10) / 10
  if (arr[0]) arr[0].percentual = Math.round((arr[0].percentual + resto) * 10) / 10
  return arr
}

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

// URL de ativação do teste: URL de qualquer variante sem o último segmento do
// path (a letra/versão, ex: /a, /a-v2) — é a URL "raiz" que o redirecionador
// de split-test usa pra distribuir o tráfego entre as variantes.
function urlAtivacaoDoTeste(variantes: { urlVariante: string }[]): string | null {
  const primeira = variantes.find(v => v.urlVariante.trim())?.urlVariante
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

export function NovoTesteABForm({
  funis, metricasVendas, metricasAquisicao, paginas, especialistas, campanhas, segmentos, responsaveis, angulos,
  elementosTestados, secoesPagina, testesExistentes, paginasEmTesteAtivo, testeParaEditar,
}: Props) {
  const router = useRouter()
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  const modoEdicao = !!testeParaEditar

  const paginasEmUsoMap = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of paginasEmTesteAtivo ?? []) mapa.set(p.pagina_id, p.teste_nome)
    return mapa
  }, [paginasEmTesteAtivo])

  const [nome, setNome] = useState(testeParaEditar?.nome ?? '')
  const [funilId, setFunilId] = useState(testeParaEditar?.funil_id ?? '')
  const [campanhaId, setCampanhaId] = useState(testeParaEditar?.campanha_id ?? '')
  const [novaCampanhaCodigo, setNovaCampanhaCodigo] = useState('')
  const [segmento, setSegmento] = useState(testeParaEditar?.segmento ?? '')
  const [responsavel, setResponsavel] = useState(testeParaEditar?.responsavel ?? '')
  const [dataInicio, setDataInicio] = useState(testeParaEditar?.data_inicio ?? hoje())

  const [hipotese, setHipotese] = useState(testeParaEditar?.hipotese ?? '')
  const [hipoteseMotivo, setHipoteseMotivo] = useState(testeParaEditar?.hipotese_motivo ?? '')
  const [resultadoEsperado, setResultadoEsperado] = useState(testeParaEditar?.resultado_esperado ?? '')
  const [elementoTestado, setElementoTestado] = useState(testeParaEditar?.elemento_testado ?? '')
  const [elementosState, setElementosState] = useState(elementosTestados)
  const [criandoElemento, setCriandoElemento] = useState(false)
  const [novoElementoValor, setNovoElementoValor] = useState('')
  const [salvandoElemento, setSalvandoElemento] = useState(false)
  const [erroElemento, setErroElemento] = useState('')

  async function criarNovoElemento() {
    const valor = novoElementoValor.trim()
    if (!valor) return
    setSalvandoElemento(true)
    setErroElemento('')
    try {
      await criarConfiguracao({ categoria: 'elemento_testado', valor })
      setElementosState(prev => prev.includes(valor) ? prev : [...prev, valor])
      setElementoTestado(valor)
      setCriandoElemento(false)
      setNovoElementoValor('')
    } catch {
      setErroElemento('Não foi possível criar. Tente novamente.')
    } finally {
      setSalvandoElemento(false)
    }
  }

  const [secaoPagina, setSecaoPagina] = useState(testeParaEditar?.secao_pagina ?? '')
  const [secoesState, setSecoesState] = useState(secoesPagina)
  const [criandoSecao, setCriandoSecao] = useState(false)
  const [novaSecaoValor, setNovaSecaoValor] = useState('')
  const [salvandoSecao, setSalvandoSecao] = useState(false)
  const [erroSecao, setErroSecao] = useState('')

  async function criarNovaSecao() {
    const valor = novaSecaoValor.trim()
    if (!valor) return
    setSalvandoSecao(true)
    setErroSecao('')
    try {
      await criarConfiguracao({ categoria: 'secao_pagina', valor })
      setSecoesState(prev => prev.includes(valor) ? prev : [...prev, valor])
      setSecaoPagina(valor)
      setCriandoSecao(false)
      setNovaSecaoValor('')
    } catch {
      setErroSecao('Não foi possível criar. Tente novamente.')
    } finally {
      setSalvandoSecao(false)
    }
  }

  const [variantes, setVariantes] = useState<Variante[]>(() => {
    if (!testeParaEditar?.variantes_teste?.length) return redistribuir([varianteVazia('A'), varianteVazia('B')])
    return [...testeParaEditar.variantes_teste]
      .sort((a, b) => (b.is_controle ? 1 : 0) - (a.is_controle ? 1 : 0))
      .map((v, idx) => ({
        id: v.id,
        letra: LETRAS[idx] ?? String.fromCharCode(65 + idx),
        paginaId: v.pagina_id ?? '',
        urlVariante: v.url_variante ?? '',
        urlPreview: v.url_preview ?? '',
        headline: v.headline ?? '',
        subheadline: v.subheadline ?? '',
        layout: v.layout ?? '',
        screenshotUrl: v.screenshot_url ?? '',
        enviando: false,
        percentual: v.percentual_trafego ?? 0,
        // Testes criados antes do ângulo virar por variante: aproveita o
        // ângulo do teste (nível antigo) só na Controle, na 1ª edição.
        anguloDominante: v.angulo_dominante ?? (idx === 0 ? testeParaEditar?.angulos?.[0] ?? '' : ''),
        angulosSecundarios: v.angulos_secundarios ?? (idx === 0 ? testeParaEditar?.angulos?.slice(1) ?? [] : []),
      }))
  })
  const [metricaPrimaria, setMetricaPrimaria] = useState(testeParaEditar?.metrica_primaria ?? '')
  const [nivelConfianca, setNivelConfianca] = useState(testeParaEditar?.nivel_confianca ?? 95)
  const [poderEstatistico, setPoderEstatistico] = useState(testeParaEditar?.poder_estatistico ?? 80)
  const [urlAtivacao, setUrlAtivacao] = useState(testeParaEditar?.url_ativacao ?? '')
  const [urlAtivacaoEditada, setUrlAtivacaoEditada] = useState(!!testeParaEditar?.url_ativacao)

  const [salvando, setSalvando] = useState<'planejado' | 'ativo' | 'edicao' | null>(null)
  const [erro, setErro] = useState('')
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null)

  const funilSelecionado = funis.find(f => f.id === funilId)
  const paginasDoFunil = paginas.filter(p =>
    p.funil_id === funilId || (!p.funil_id && !!funilSelecionado?.produto_id && p.produto_id === funilSelecionado.produto_id)
  )
  const paginasDoProduto = new Set(paginas.filter(p => !p.funil_id).map(p => p.id))
  const campanhaSelecionada = campanhas.find(c => c.id === campanhaId)
  const especialistaId = funilSelecionado?.especialista_id || funilSelecionado?.produtos?.especialista_id || ''
  const especialistaNome = especialistas.find(e => e.id === especialistaId)?.nome || ''
  const tipoTeste: 'aquisicao' | 'vendas' = funilSelecionado?.objetivo === 'Aquisição' ? 'aquisicao' : 'vendas'
  const metricas = tipoTeste === 'aquisicao' ? metricasAquisicao : metricasVendas

  const funisAgrupados = useMemo(() => {
    const grupos = new Map<string, typeof funis>()
    for (const f of funis) {
      const espId = f.especialista_id || f.produtos?.especialista_id || ''
      const nome = especialistas.find(e => e.id === espId)?.nome || 'Sem especialista'
      grupos.set(nome, [...(grupos.get(nome) ?? []), f])
    }
    return Array.from(grupos.entries())
      .sort(([a], [b]) => (a === 'Sem especialista' ? 1 : b === 'Sem especialista' ? -1 : a.localeCompare(b)))
      .map(([nomeEspecialista, lista]) => ({ nomeEspecialista, funis: lista.sort((a, b) => a.nome.localeCompare(b.nome)) }))
  }, [funis, especialistas])

  function scrollPara(id: string) {
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function toggleAnguloVariante(idx: number, valor: string) {
    setVariantes(list => list.map((v, i) => {
      if (i !== idx) return v
      const selecionados = [v.anguloDominante, ...v.angulosSecundarios].filter(Boolean)
      if (selecionados.includes(valor)) {
        if (v.anguloDominante === valor) {
          const [novoDominante, ...resto] = v.angulosSecundarios
          return { ...v, anguloDominante: novoDominante ?? '', angulosSecundarios: resto }
        }
        return { ...v, angulosSecundarios: v.angulosSecundarios.filter(a => a !== valor) }
      }
      if (selecionados.length >= MAX_ANGULOS) return v
      if (!v.anguloDominante) return { ...v, anguloDominante: valor }
      return { ...v, angulosSecundarios: [...v.angulosSecundarios, valor] }
    }))
  }

  function marcarAnguloDominante(idx: number, valor: string) {
    setVariantes(list => list.map((v, i) => {
      if (i !== idx || v.anguloDominante === valor) return v
      const secundarios = [v.anguloDominante, ...v.angulosSecundarios].filter((a): a is string => !!a && a !== valor)
      return { ...v, anguloDominante: valor, angulosSecundarios: secundarios }
    }))
  }

  function selecionarPaginaVariante(idx: number, pid: string) {
    const pagina = paginasDoFunil.find(p => p.id === pid)
    setVariantes(list => list.map((vv, i) => (i === idx
      ? { ...vv, paginaId: pid, urlVariante: pagina?.url_pagina || vv.urlVariante }
      : vv)))
  }

  function adicionarVariante() {
    if (variantes.length >= 4) return
    setVariantes(v => redistribuir([...v, varianteVazia(LETRAS[v.length])]))
  }

  function removerVariante(idx: number) {
    if (variantes.length <= 2 || idx === 0) return
    setVariantes(v => redistribuir(v.filter((_, i) => i !== idx).map((vv, i) => ({ ...vv, letra: LETRAS[i] }))))
  }

  function distribuirIgualmente() {
    setVariantes(v => redistribuir(v))
  }

  function definirPercentual(idx: number, valor: number) {
    const limitado = Math.max(0, Math.min(100, valor))
    setVariantes(v => v.map((vv, i) => (i === idx ? { ...vv, percentual: limitado } : vv)))
  }

  async function handleArquivo(idx: number, file: File) {
    const ehHtml = file.type === 'text/html' || /\.html?$/i.test(file.name)
    const ehImagem = file.type.startsWith('image/')
    if (!ehImagem && !ehHtml) {
      setErro('Envie uma imagem (PNG, JPG...) ou um arquivo HTML (ex: salvo com SingleFile).')
      return
    }
    const limite = 20 * 1024 * 1024
    if (file.size > limite) {
      setErro('Arquivo maior que 20MB.')
      return
    }

    setVariantes(v => v.map((vv, i) => (i === idx ? { ...vv, enviando: true } : vv)))
    try {
      // Upload direto do navegador pro Supabase Storage (não passa pela Server
      // Action) — a Vercel limita o corpo de funções serverless a ~4.5MB.
      const assinado = await criarUploadAssinado({ nomeOriginal: file.name, ehHtml })
      if (!assinado.ok || !assinado.path || !assinado.token) {
        throw new Error(assinado.erro ?? 'Erro ao preparar upload.')
      }
      const supabase = createClient()
      const { error } = await supabase.storage
        .from(BUCKET_SCREENSHOTS)
        .uploadToSignedUrl(assinado.path, assinado.token, file, {
          contentType: ehHtml ? 'text/html' : file.type,
        })
      if (error) throw error
      const { data } = supabase.storage.from(BUCKET_SCREENSHOTS).getPublicUrl(assinado.path)
      setVariantes(v => v.map((vv, i) => (i === idx ? { ...vv, enviando: false, screenshotUrl: data.publicUrl } : vv)))
    } catch (e) {
      setVariantes(v => v.map((vv, i) => (i === idx ? { ...vv, enviando: false } : vv)))
      setErro(e instanceof Error ? e.message : 'Erro ao subir a imagem.')
    }
  }

  function removerScreenshot(idx: number) {
    setVariantes(v => v.map((vv, i) => (i === idx ? { ...vv, screenshotUrl: '' } : vv)))
  }

  // ── Progresso por seção (para o checklist lateral) ──────────────────────
  const progresso = useMemo(() => {
    // Só os campos marcados com * contam pra "Completo" — o resto é complementar
    // e não deve travar a seção em "Em andamento" pra sempre.
    const basicasObrigatorios = [nome.trim(), funilId]
    const basicas = basicasObrigatorios.filter(Boolean).length / basicasObrigatorios.length

    const hipoteseObrigatorios = [hipotese.trim(), resultadoEsperado.trim(), elementoTestado]
    const hipoteseP = hipoteseObrigatorios.filter(Boolean).length / hipoteseObrigatorios.length

    const variacoes = variantes.every(v => v.paginaId && v.urlVariante.trim())
      ? 1
      : variantes.filter(v => v.paginaId && v.urlVariante.trim()).length / variantes.length

    const metricasP = metricaPrimaria ? 1 : 0

    const revisaoP = basicas === 1 && hipoteseP === 1 && variacoes === 1 && metricasP === 1 ? 1 : 0

    return { basicas, hipotese: hipoteseP, variacoes, metricas: metricasP, revisao: revisaoP }
  }, [nome, funilId, hipotese, resultadoEsperado, elementoTestado, variantes, metricaPrimaria])

  const progressoGeral = Math.round(
    ((progresso.basicas + progresso.hipotese + progresso.variacoes + progresso.metricas) / 4) * 100
  )

  const podeAvancarDefinicao = !!nome.trim() && !!funilId
  const podeAvancarConfiguracao = variantes.every(v => v.paginaId && v.urlVariante.trim())
  const podeFinalizar = podeAvancarDefinicao && podeAvancarConfiguracao && !!metricaPrimaria

  const somaPercentuais = Math.round(variantes.reduce((s, v) => s + v.percentual, 0) * 10) / 10

  const sequencialPreview = String(
    testesExistentes.filter(t => t.funil_id === funilId && (t.segmento ?? '') === segmento).length + 1
  ).padStart(3, '0')
  const codigoPreview = [sequencialPreview, segmento, novaCampanhaCodigo.trim() || campanhaSelecionada?.codigo].filter(Boolean).join('_')

  // Recalcula a URL de ativação a partir das variantes só enquanto o usuário
  // não editar manualmente na Revisão (ex: quando o cálculo automático erra).
  useEffect(() => {
    if (urlAtivacaoEditada) return
    const auto = urlAtivacaoDoTeste(variantes)
    if (auto) setUrlAtivacao(auto)
  }, [variantes, urlAtivacaoEditada])

  // Trocar o Funil de Atuação significa recomeçar a associação de páginas —
  // qualquer URL de ativação herdada (ex: de uma duplicação) deixa de fazer
  // sentido, então volta a recalcular sozinha a partir das novas variantes.
  const funilIdAnterior = useRef(funilId)
  useEffect(() => {
    if (funilIdAnterior.current !== funilId) {
      funilIdAnterior.current = funilId
      setUrlAtivacaoEditada(false)
    }
  }, [funilId])

  async function finalizar(status: 'Planejado' | 'Ativo') {
    setSalvando(status === 'Ativo' ? 'ativo' : 'planejado')
    setErro('')
    const res = await criarTesteAB({
      funil_id: funilId,
      tipo_teste: tipoTeste,
      nome,
      hipotese,
      hipotese_motivo: hipoteseMotivo,
      resultado_esperado: resultadoEsperado,
      elemento_testado: elementoTestado || undefined,
      secao_pagina: secaoPagina || undefined,
      campanha_id: campanhaId && campanhaId !== NOVA_CAMPANHA ? campanhaId : undefined,
      nova_campanha_codigo: campanhaId === NOVA_CAMPANHA ? novaCampanhaCodigo : undefined,
      segmento: segmento || undefined,
      especialista_id: especialistaId || undefined,
      responsavel: responsavel || undefined,
      data_inicio: dataInicio || undefined,
      metrica_primaria: metricaPrimaria,
      nivel_confianca: nivelConfianca,
      poder_estatistico: poderEstatistico,
      url_ativacao: urlAtivacao || undefined,
      status,
      variantes: variantes.map((v, i) => ({
        nome: `Variação ${v.letra}`,
        pagina_id: v.paginaId,
        url_variante: v.urlVariante,
        url_preview: v.urlPreview || undefined,
        headline: v.headline || undefined,
        subheadline: v.subheadline || undefined,
        layout: v.layout || undefined,
        screenshot_url: v.screenshotUrl || undefined,
        percentual_trafego: v.percentual,
        is_controle: i === 0,
        angulo_dominante: v.anguloDominante || undefined,
        angulos_secundarios: v.angulosSecundarios.length ? v.angulosSecundarios : undefined,
      })),
    })
    setSalvando(null)
    if (!res.ok) { setErro(res.erro ?? 'Erro ao criar teste.'); return }
    router.push('/variantes')
  }

  async function salvarEdicao() {
    if (!testeParaEditar) return
    setSalvando('edicao')
    setErro('')
    const res = await atualizarTesteAB(testeParaEditar.id, {
      funil_id: funilId,
      tipo_teste: tipoTeste,
      nome,
      hipotese,
      hipotese_motivo: hipoteseMotivo,
      resultado_esperado: resultadoEsperado,
      elemento_testado: elementoTestado || undefined,
      secao_pagina: secaoPagina || undefined,
      campanha_id: campanhaId && campanhaId !== NOVA_CAMPANHA ? campanhaId : undefined,
      nova_campanha_codigo: campanhaId === NOVA_CAMPANHA ? novaCampanhaCodigo : undefined,
      segmento: segmento || undefined,
      especialista_id: especialistaId || undefined,
      responsavel: responsavel || undefined,
      data_inicio: dataInicio || undefined,
      metrica_primaria: metricaPrimaria,
      nivel_confianca: nivelConfianca,
      poder_estatistico: poderEstatistico,
      url_ativacao: urlAtivacao || undefined,
      status: testeParaEditar.status,
      variantes: variantes.map((v, i) => ({
        id: v.id,
        nome: `Variação ${v.letra}`,
        pagina_id: v.paginaId,
        url_variante: v.urlVariante,
        url_preview: v.urlPreview || undefined,
        headline: v.headline || undefined,
        subheadline: v.subheadline || undefined,
        layout: v.layout || undefined,
        screenshot_url: v.screenshotUrl || undefined,
        percentual_trafego: v.percentual,
        is_controle: i === 0,
        angulo_dominante: v.anguloDominante || undefined,
        angulos_secundarios: v.angulosSecundarios.length ? v.angulosSecundarios : undefined,
      })),
    })
    setSalvando(null)
    if (!res.ok) { setErro(res.erro ?? 'Erro ao salvar alterações.'); return }
    router.push(`/variantes/${testeParaEditar.id}`)
  }

  const inputCls = 'w-full bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500'
  const labelCls = 'text-slate-400 text-xs'
  const cardCls = 'bg-slate-900 border border-slate-800 rounded-xl p-6'

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Breadcrumb + título */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-slate-500 mb-2 text-sm">
          <Link href="/variantes" className="hover:text-slate-300 transition-colors">Experimentos</Link>
          <ChevronRight size={14} />
          <span className="text-indigo-400 font-medium">{modoEdicao ? 'Editar Experimento' : 'Novo Experimento'}</span>
        </nav>
        <h2 className="text-2xl font-bold text-white">{modoEdicao ? 'Editar Experimento' : 'Criar Experimento'}</h2>
        <p className="text-slate-500 text-sm mt-1">
          {modoEdicao ? 'Ajuste os parâmetros do experimento.' : 'Configure os parâmetros do seu teste estatístico para otimizar conversões.'}
        </p>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Conteúdo (página única, scroll) ─────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-8">

          {/* Informações Básicas */}
          <div ref={el => { refs.current.basicas = el }} className={cardCls}>
            <h3 className="text-white font-medium mb-6 flex items-center gap-2">
              <Info size={16} className="text-indigo-400" /> Informações Básicas
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Nome do Experimento *</Label>
                  <Input
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Formulário com 2 campos (email + nome)"
                    className={inputCls}
                  />
                  <p className="text-slate-600 text-xs">
                    Descreva a mudança testada, não o contexto — Funil, Campanha, Elemento e Segmento já aparecem em colunas próprias na lista.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>ID do Teste</Label>
                  <div className="h-10 px-3 flex items-center bg-slate-900 border border-slate-800 rounded-md text-slate-400 text-sm font-mono whitespace-nowrap">
                    {codigoPreview}
                  </div>
                  <p className="text-slate-600 text-xs">Gerado automaticamente</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>Funil de Atuação *</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={funilId || '__none__'}
                    onValueChange={v => {
                      setFunilId(v === '__none__' ? '' : v)
                      setVariantes(list => list.map(vv => ({ ...vv, paginaId: '', urlVariante: '' })))
                      setMetricaPrimaria('')
                    }}
                  >
                    <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
                      <SelectValue placeholder="Selecionar funil..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Selecionar funil...</SelectItem>
                      {funisAgrupados.map(({ nomeEspecialista, funis: funisDoGrupo }) => (
                        <SelectGroup key={nomeEspecialista}>
                          <SelectLabel className="text-slate-500 text-[11px] uppercase tracking-wide">{nomeEspecialista}</SelectLabel>
                          {funisDoGrupo.map(f => (
                            <SelectItem key={f.id} value={f.id} className="text-slate-300 focus:bg-slate-800 focus:text-white">
                              {f.id_funil ? `[${f.id_funil}] ` : ''}{f.nome}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {funilId && (
                    <span className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                      tipoTeste === 'aquisicao' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {tipoTeste === 'aquisicao' ? 'Aquisição' : 'Vendas'}
                    </span>
                  )}
                </div>
                {funilId && paginasDoFunil.length === 0 && (
                  <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-1.5">
                    Este funil não tem páginas cadastradas ainda. Cadastre-as no Mapa de Páginas antes de criar o teste —
                    toda variante precisa estar vinculada a uma página do registro.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Campanha</Label>
                  <Select value={campanhaId || '__none__'} onValueChange={v => setCampanhaId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
                      <SelectValue placeholder="Selecionar campanha..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Sem campanha</SelectItem>
                      {campanhas.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-slate-300 focus:bg-slate-800 focus:text-white">{c.codigo}</SelectItem>
                      ))}
                      <SelectItem value={NOVA_CAMPANHA} className="text-indigo-400 focus:bg-slate-800 focus:text-indigo-300">+ Nova campanha</SelectItem>
                    </SelectContent>
                  </Select>
                  {campanhaId === NOVA_CAMPANHA && (
                    <Input
                      value={novaCampanhaCodigo}
                      onChange={e => setNovaCampanhaCodigo(e.target.value)}
                      placeholder='Código da campanha, ex: "D90"'
                      className={`${inputCls} mt-2`}
                    />
                  )}
                  <p className="text-slate-600 text-xs">Uma campanha pode abranger mais de um funil (ex: aquisição + vendas do mesmo lançamento).</p>
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>Segmento (público)</Label>
                  <Select value={segmento || '__none__'} onValueChange={v => setSegmento(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
                      <SelectValue placeholder="Selecionar segmento..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Selecionar segmento...</SelectItem>
                      {segmentos.map(s => (
                        <SelectItem key={s} value={s} className="text-slate-300 focus:bg-slate-800 focus:text-white">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Especialista</Label>
                  <div className="h-10 px-3 flex items-center bg-slate-900 border border-slate-800 rounded-md text-sm">
                    {especialistaNome
                      ? <span className="text-white">{especialistaNome}</span>
                      : <span className="text-slate-600">{funilId ? 'Funil sem especialista cadastrado' : 'Selecione um funil'}</span>}
                  </div>
                  <p className="text-slate-600 text-xs">Vem do especialista já cadastrado no Funil.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>Responsável</Label>
                  <Select value={responsavel || '__none__'} onValueChange={v => setResponsavel(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
                      <SelectValue placeholder="Selecionar responsável..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Selecionar responsável...</SelectItem>
                      {responsaveis.map(r => (
                        <SelectItem key={r} value={r} className="text-slate-300 focus:bg-slate-800 focus:text-white">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>Data de Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className={`${inputCls} h-10 max-w-[220px]`}
                />
              </div>
            </div>
          </div>

          {/* Hipótese */}
          <div ref={el => { refs.current.hipotese = el }} className={cardCls}>
            <h3 className="text-white font-medium flex items-center gap-2 mb-4">
              <Brain size={16} className="text-indigo-400" /> Framework de Hipótese
            </h3>
            <div className="flex items-center gap-x-6 gap-y-3 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-slate-500 text-xs shrink-0 whitespace-nowrap">O que vamos testar?</Label>
                {criandoElemento ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      value={novoElementoValor}
                      onChange={e => setNovoElementoValor(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') criarNovoElemento() }}
                      placeholder="Nome do novo elemento..."
                      className="w-44 h-9 bg-slate-900 border-slate-800 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={criarNovoElemento}
                      disabled={salvandoElemento || !novoElementoValor.trim()}
                      className="text-green-400 hover:text-green-300 disabled:opacity-40 shrink-0"
                      title="Salvar"
                    >
                      {salvandoElemento ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCriandoElemento(false); setNovoElementoValor(''); setErroElemento('') }}
                      className="text-slate-500 hover:text-slate-300 shrink-0"
                      title="Cancelar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <Select
                    value={elementoTestado || '__none__'}
                    onValueChange={v => v === NOVO_ELEMENTO ? setCriandoElemento(true) : setElementoTestado(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="w-44 h-9 bg-slate-900 border-slate-800 text-white text-sm focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Selecionar...</SelectItem>
                      {elementosState.map(el => (
                        <SelectItem key={el} value={el} className="text-slate-300 focus:bg-slate-800 focus:text-white">{el}</SelectItem>
                      ))}
                      <SelectItem value={NOVO_ELEMENTO} className="text-indigo-400 focus:bg-slate-800 focus:text-indigo-300">+ Novo elemento</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-slate-500 text-xs shrink-0 whitespace-nowrap">Seção da página</Label>
                {criandoSecao ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      value={novaSecaoValor}
                      onChange={e => setNovaSecaoValor(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') criarNovaSecao() }}
                      placeholder="Seções são posições, não tipos de bloco"
                      className="w-56 h-9 bg-slate-900 border-slate-800 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={criarNovaSecao}
                      disabled={salvandoSecao || !novaSecaoValor.trim()}
                      className="text-green-400 hover:text-green-300 disabled:opacity-40 shrink-0"
                      title="Salvar"
                    >
                      {salvandoSecao ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCriandoSecao(false); setNovaSecaoValor(''); setErroSecao('') }}
                      className="text-slate-500 hover:text-slate-300 shrink-0"
                      title="Cancelar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <Select
                    value={secaoPagina || '__none__'}
                    onValueChange={v => v === NOVA_SECAO ? setCriandoSecao(true) : setSecaoPagina(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="w-44 h-9 bg-slate-900 border-slate-800 text-white text-sm focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Selecionar...</SelectItem>
                      {secoesState.map(s => (
                        <SelectItem key={s} value={s} className="text-slate-300 focus:bg-slate-800 focus:text-white">{s}</SelectItem>
                      ))}
                      <SelectItem value={NOVA_SECAO} className="text-indigo-400 focus:bg-slate-800 focus:text-indigo-300">+ Nova seção</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {(erroElemento || erroSecao) && <p className="text-red-400 text-xs text-right -mt-4 mb-4">{erroElemento || erroSecao}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div className="space-y-1.5">
                <Label className={labelCls}>O QUE vamos mudar?</Label>
                <Textarea
                  value={hipotese}
                  onChange={e => setHipotese(e.target.value)}
                  placeholder="Ex: Reduzir o formulário de 3 campos para 2 (email + nome)"
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
                <p className={`text-xs text-right ${hipotese.length > LIMITE_HIPOTESE ? 'text-amber-400' : 'text-slate-600'}`}>
                  {hipotese.length}/{LIMITE_HIPOTESE} — uma hipótese cabe numa frase só
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>POR QUE estamos mudando?</Label>
                <Textarea
                  value={hipoteseMotivo}
                  onChange={e => setHipoteseMotivo(e.target.value)}
                  placeholder="Ex: Gravações mostram abandono alto no campo telefone"
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Resultado esperado</Label>
                <Textarea
                  value={resultadoEsperado}
                  onChange={e => setResultadoEsperado(e.target.value)}
                  placeholder="Ex: Aumento de 15% na taxa de conversão do formulário"
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {(elementoTestado || hipotese.trim()) && (
              <div className="border-t border-slate-800 pt-6">
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                  <p className="text-indigo-400 text-[10px] font-semibold uppercase tracking-wide mb-1">Hipótese Consolidada</p>
                  <p className="text-slate-400 text-xs italic">
                    &quot;Se eu testar <span className="text-indigo-300 font-medium not-italic">{elementoTestado || '[elemento]'}</span>
                    {hipotese.trim() && <> (<span className="text-indigo-300 font-medium not-italic">{hipotese.trim()}</span>)</>}
                    {' '}no <span className="text-indigo-300 font-medium not-italic">{segmento ? `tráfego ${segmento.toLowerCase()}` : '[público]'}</span>,
                    {' '}então <span className="text-indigo-300 font-medium not-italic">{metricaPrimaria || '[métrica]'}</span> vai
                    {' '}melhorar{hipoteseMotivo.trim() && <>, porque <span className="text-indigo-300 font-medium not-italic">{hipoteseMotivo.trim()}</span></>}.&quot;
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Variações */}
          <div ref={el => { refs.current.variacoes = el }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center gap-2">
                <SplitSquareHorizontal size={16} className="text-indigo-400" /> Variações
              </h3>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${somaPercentuais === 100 ? 'text-slate-500' : 'text-amber-400'}`}>
                  Total: {somaPercentuais}%
                </span>
                <button type="button" onClick={distribuirIgualmente} className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
                  Distribuir tráfego igualmente
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variantes.map((v, idx) => (
                <div key={v.letra} className={cardCls}>
                  <div className="mb-4 space-y-1.5">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      {idx === 0
                        ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                        : <Rocket size={16} className="text-indigo-400 shrink-0" />}
                      <span className="truncate">{idx === 0 ? `Controle (${v.letra})` : `Variação ${v.letra}`}</span>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => removerVariante(idx)}
                          title="Remover variante"
                          className="ml-auto text-slate-600 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 pl-6">
                      <label className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-400 bg-indigo-500/10 rounded-full pl-2 pr-1 py-0.5">
                        Tráfego
                        <input
                          type="number" min={0} max={100}
                          value={v.percentual}
                          onChange={e => definirPercentual(idx, e.target.value === '' ? 0 : Number(e.target.value))}
                          onFocus={e => e.target.select()}
                          className="w-10 bg-transparent text-right focus:outline-none"
                        />
                        %
                      </label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label
                      tabIndex={0}
                      onPaste={e => {
                        const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
                        const f = item?.getAsFile()
                        if (f) handleArquivo(idx, f)
                      }}
                      className="border-2 border-dashed border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-950 hover:bg-slate-900 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      <input
                        type="file"
                        accept="image/*,.html,.htm,text/html"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleArquivo(idx, f) }}
                      />
                      {v.enviando ? (
                        <Loader2 size={20} className="text-indigo-400 animate-spin mb-2" />
                      ) : v.screenshotUrl && ehArquivoHtml(v.screenshotUrl) ? (
                        <div className="relative w-full flex flex-col items-center justify-center py-4">
                          <FileCode2 size={28} className="text-indigo-400 mb-2" />
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); removerScreenshot(idx) }}
                            className="absolute top-0 right-0 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                            title="Remover"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : v.screenshotUrl ? (
                        <div className="relative w-full aspect-[5/2] mb-2 min-h-0 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.screenshotUrl} alt={`Screenshot variação ${v.letra}`} className="w-full h-full rounded object-cover object-top" />
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setImagemAmpliada(v.screenshotUrl) }}
                              className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                              title="Ampliar"
                            >
                              <ZoomIn size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); removerScreenshot(idx) }}
                              className="p-1.5 bg-black/60 hover:bg-red-900/80 rounded-lg text-white transition-colors"
                              title="Remover"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <Upload size={20} className="text-slate-600 mb-2" />
                      )}
                      <p className="text-xs text-slate-500">
                        {v.enviando
                          ? 'Enviando...'
                          : v.screenshotUrl
                          ? (ehArquivoHtml(v.screenshotUrl) ? 'Trocar referência HTML' : 'Trocar screenshot')
                          : 'Upload de Screenshot ou HTML'}
                      </p>
                      {!v.enviando && !v.screenshotUrl && (
                        <p className="text-[11px] text-slate-600 mt-0.5">Clique e cole (Ctrl+V), arraste ou selecione (imagem ou .html salvo com SingleFile)</p>
                      )}
                    </label>
                    {v.screenshotUrl && ehArquivoHtml(v.screenshotUrl) && (
                      <button
                        type="button"
                        onClick={() => abrirReferenciaHtml(v.screenshotUrl)}
                        className="text-indigo-400 text-xs hover:underline -mt-2 block text-left"
                      >
                        Abrir referência HTML em nova aba ↗
                      </button>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 text-xs">Página *</Label>
                      <Select
                        value={v.paginaId || '__none__'}
                        onValueChange={pid => selecionarPaginaVariante(idx, pid === '__none__' ? '' : pid)}
                      >
                        <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-white text-sm h-9 focus:ring-0 focus:ring-offset-0">
                          <SelectValue placeholder="Selecionar página cadastrada..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Selecionar página cadastrada...</SelectItem>
                          <SelectGroup>
                            <SelectLabel className="text-slate-600 text-[11px] uppercase tracking-wide">Páginas do Funil</SelectLabel>
                            {paginasDoFunil.filter(p => !paginasDoProduto.has(p.id)).map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-slate-300 focus:bg-slate-800 focus:text-white">
                                {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          {paginasDoFunil.some(p => paginasDoProduto.has(p.id)) && (
                            <SelectGroup>
                              <SelectLabel className="text-slate-600 text-[11px] uppercase tracking-wide">Páginas do Produto</SelectLabel>
                              {paginasDoFunil.filter(p => paginasDoProduto.has(p.id)).map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-slate-300 focus:bg-slate-800 focus:text-white">
                                  {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {v.paginaId && paginasEmUsoMap.has(v.paginaId) && (
                      <p className="flex items-start gap-1.5 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        Esta página já está em uso no teste ativo &quot;{paginasEmUsoMap.get(v.paginaId)}&quot;.
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 text-xs">URL da Página *</Label>
                      <Input
                        value={v.urlVariante}
                        onChange={e => setVariantes(list => list.map((vv, i) => i === idx ? { ...vv, urlVariante: e.target.value } : vv))}
                        placeholder="https://dominio.com/..."
                        className={`${inputCls} text-sm`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 text-xs">URL de Preview</Label>
                      <Input
                        value={v.urlPreview}
                        onChange={e => setVariantes(list => list.map((vv, i) => i === idx ? { ...vv, urlPreview: e.target.value } : vv))}
                        placeholder="Link de pré-visualização (antes de publicar)"
                        className={`${inputCls} text-sm`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 text-xs">Headline testada</Label>
                      <Textarea
                        value={v.headline}
                        onChange={e => setVariantes(list => list.map((vv, i) => i === idx ? { ...vv, headline: e.target.value } : vv))}
                        placeholder="Texto principal testado"
                        rows={2}
                        className={`${inputCls} text-sm resize-none`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 text-xs">Subheadline testada</Label>
                      <Textarea
                        value={v.subheadline}
                        onChange={e => setVariantes(list => list.map((vv, i) => i === idx ? { ...vv, subheadline: e.target.value } : vv))}
                        placeholder="Texto de apoio"
                        rows={2}
                        className={`${inputCls} text-sm resize-none`}
                      />
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <Label className="text-slate-500 text-xs">Layout</Label>
                      <div className="flex gap-2">
                        {LAYOUTS.map(l => (
                          <button
                            key={l.valor}
                            type="button"
                            onClick={() => setVariantes(list => list.map((vv, i) => i === idx ? { ...vv, layout: vv.layout === l.valor ? '' : l.valor } : vv))}
                            className={`flex-1 h-9 rounded-lg text-xs font-medium border transition-colors ${
                              v.layout === l.valor
                                ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-500 text-xs">Ângulo da Hero desta variação</Label>
                        <span className="text-slate-600 text-[10px]">
                          {[v.anguloDominante, ...v.angulosSecundarios].filter(Boolean).length}/{MAX_ANGULOS}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {angulos.map(a => {
                          const dominante = v.anguloDominante === a
                          const secundario = v.angulosSecundarios.includes(a)
                          const ativo = dominante || secundario
                          const bloqueado = !ativo && [v.anguloDominante, ...v.angulosSecundarios].filter(Boolean).length >= MAX_ANGULOS
                          return (
                            <button
                              key={a}
                              type="button"
                              disabled={bloqueado}
                              onClick={() => toggleAnguloVariante(idx, a)}
                              title={dominante ? `${a} — dominante` : secundario ? `${a} — secundário` : a}
                              className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-30 ${
                                dominante
                                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                                  : secundario
                                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {iconeAngulo(a) && <span>{iconeAngulo(a)}</span>} {a}
                              {ativo && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={e => { e.stopPropagation(); marcarAnguloDominante(idx, a) }}
                                  className="p-0.5"
                                >
                                  <Star size={11} className={dominante ? 'fill-indigo-400 text-indigo-400' : 'text-slate-600 hover:text-slate-400'} />
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {(v.anguloDominante || v.angulosSecundarios.length > 0) && (
                        <p className="text-slate-600 text-[11px]">
                          Clique na estrela pra trocar qual ângulo é o dominante.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {variantes.length < 4 && (
                <button
                  type="button"
                  onClick={adicionarVariante}
                  className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-900 hover:border-slate-700 transition-colors min-h-[220px]"
                >
                  <PlusCircle size={28} className="text-indigo-400" />
                  <p className="text-indigo-400 text-sm font-medium">Adicionar Variante</p>
                  <p className="text-slate-600 text-xs text-center px-6">Até 4 variações neste teste.</p>
                </button>
              )}
            </div>

            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-800 gap-px">
              {variantes.map((v, i) => (
                <div
                  key={v.letra}
                  className="h-full"
                  style={{ width: `${v.percentual}%`, backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'][i] }}
                />
              ))}
            </div>
          </div>

          {/* Métricas */}
          <div ref={el => { refs.current.metricas = el }} className={cardCls}>
            <h3 className="text-white font-medium mb-1 flex items-center gap-2">
              <MousePointerClick size={16} className="text-indigo-400" /> Sucesso do Experimento
            </h3>
            <p className="text-slate-600 text-xs mb-6">
              Métricas de {tipoTeste === 'aquisicao' ? 'Aquisição' : 'Vendas'}
            </p>
            <div className="space-y-8">
              <div className="space-y-1.5">
                <Label className={labelCls}>Métrica Primária *</Label>
                {metricas.length > 0 ? (
                  <Select value={metricaPrimaria || '__none__'} onValueChange={v => setMetricaPrimaria(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
                      <SelectValue placeholder="Selecionar métrica..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">Selecionar métrica...</SelectItem>
                      {metricas.map(m => (
                        <SelectItem key={m} value={m} className="text-slate-300 focus:bg-slate-800 focus:text-white">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <ImageOff size={13} />
                    Nenhuma métrica de {tipoTeste === 'aquisicao' ? 'aquisição' : 'vendas'} cadastrada em Configurações ainda
                    (Testes A/B → Métricas de {tipoTeste === 'aquisicao' ? 'Aquisição' : 'Vendas'}).
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Nível de Confiança Mínimo</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min={90} max={99} value={nivelConfianca}
                      onChange={e => setNivelConfianca(Number(e.target.value))}
                      className="flex-1 accent-indigo-500 h-2 rounded-full"
                    />
                    <span className="text-indigo-400 text-sm font-medium bg-indigo-500/10 px-3 py-1 rounded-full">{nivelConfianca}%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Poder Estatístico</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min={70} max={95} value={poderEstatistico}
                      onChange={e => setPoderEstatistico(Number(e.target.value))}
                      className="flex-1 accent-indigo-500 h-2 rounded-full"
                    />
                    <span className="text-indigo-400 text-sm font-medium bg-indigo-500/10 px-3 py-1 rounded-full">{poderEstatistico}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revisão */}
          <div ref={el => { refs.current.revisao = el }} className={cardCls}>
            <h3 className="text-white font-medium mb-6 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-indigo-400" /> Revisão
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm mb-6">
              <p className="text-slate-500">Código do teste <span className="text-slate-300 font-mono">{codigoPreview}</span> <span className="text-slate-600 text-xs">(número definido ao salvar)</span></p>
              <p className="text-slate-500">Nome <span className="text-slate-300">{nome || '—'}</span></p>
              <p className="text-slate-500">Funil <span className="text-slate-300">{funilSelecionado?.nome ?? '—'}</span></p>
              <p className="text-slate-500">Tipo <span className="text-slate-300">{tipoTeste === 'aquisicao' ? 'Aquisição' : 'Vendas'}</span></p>
              <p className="text-slate-500">Campanha <span className="text-slate-300">{campanhaId === NOVA_CAMPANHA ? (novaCampanhaCodigo || '—') : (campanhaSelecionada?.codigo ?? '—')}</span></p>
              <p className="text-slate-500">Segmento <span className="text-slate-300">{segmento || '—'}</span></p>
              <p className="text-slate-500">
                Layout{' '}
                <span className="text-slate-300">
                  {variantes.map(v => `${v.letra}: ${LAYOUTS.find(l => l.valor === v.layout)?.label ?? '—'}`).join(' · ')}
                </span>
              </p>
              <p className="text-slate-500">
                Ângulo da Hero{' '}
                <span className="text-slate-300">
                  {variantes.map(v => `${v.letra}: ${v.anguloDominante || '—'}${v.angulosSecundarios.length ? ` (+${v.angulosSecundarios.join(', ')})` : ''}`).join(' · ')}
                </span>
              </p>
              <p className="text-slate-500">Variantes <span className="text-slate-300">{variantes.length}</span></p>
              <p className="text-slate-500">Métrica primária <span className="text-slate-300">{metricaPrimaria || '—'}</span></p>
            </div>

            <div className="space-y-1.5 mb-6">
              <Label className={labelCls}>URL de Ativação do Teste</Label>
              <Input
                value={urlAtivacao}
                onChange={e => { setUrlAtivacao(e.target.value); setUrlAtivacaoEditada(true) }}
                placeholder="Gerada automaticamente a partir da URL das variantes"
                className={`${inputCls} text-xs font-mono`}
              />
              <p className="text-slate-600 text-xs">
                Calculada automaticamente a partir da URL das variantes (remove a letra/versão do final) — edite aqui se sair errada.
                É a mesma URL usada no botão de acesso rápido na Lista de Experimentos.
              </p>
            </div>

            {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

            <div className="flex flex-col md:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
              {modoEdicao ? (
                <Button
                  type="button"
                  disabled={!podeFinalizar || salvando !== null}
                  onClick={salvarEdicao}
                  className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
                >
                  {salvando === 'edicao' ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    disabled={!podeFinalizar || salvando !== null}
                    onClick={() => finalizar('Planejado')}
                    className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 disabled:opacity-40"
                  >
                    {salvando === 'planejado' ? 'Agendando...' : 'Agendar Início'}
                  </Button>
                  <Button
                    type="button"
                    disabled={!podeFinalizar || salvando !== null}
                    onClick={() => finalizar('Ativo')}
                    className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
                  >
                    {salvando === 'ativo' ? 'Iniciando...' : 'Iniciar Agora'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Checklist de progresso lateral (direita) ─────────────────────── */}
        <nav className="w-48 shrink-0 sticky top-6 space-y-1">
          <div className="px-3 pb-3 mb-1 border-b border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-500 uppercase tracking-wide">Progresso Geral</span>
              <span className="text-xs text-indigo-400 font-medium">{progressoGeral}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressoGeral}%` }} />
            </div>
          </div>
          {SECOES.map(({ id, label, icon: Icon }) => {
            const pct = Math.round((progresso[id as keyof typeof progresso] ?? 0) * 100)
            const completo = pct === 100
            const status = pct === 0 ? 'Pendente' : completo ? 'Completo' : 'Em andamento'
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollPara(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left hover:bg-slate-900 transition-colors"
              >
                {completo ? <CheckCircle2 size={16} className="text-green-400 shrink-0" /> : <Circle size={16} className="text-slate-700 shrink-0" />}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-slate-300">{label}</span>
                  <span className="block text-[11px] text-slate-600">{status}</span>
                </span>
                <Icon size={14} className="text-slate-700 shrink-0" />
              </button>
            )
          })}
        </nav>
      </div>

      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setImagemAmpliada(null)}
        >
          <button
            type="button"
            onClick={() => setImagemAmpliada(null)}
            className="absolute top-5 right-5 p-2 bg-slate-900/80 hover:bg-slate-800 rounded-lg text-white transition-colors"
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
