'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight, Trophy, Brain, Lightbulb, ImageOff, Loader2, CheckCircle2, Rocket, AlertTriangle, FileCode2, ZoomIn, X, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  atualizarMetricasVariante, atualizarAprendizado, atualizarHipotese, declararVencedora, aplicarVencedor, desfazerVencedora,
  encerrarSemVencedor,
} from '@/lib/actions/testes-ab'
import { confiancaZTest, classificarConfianca, MIN_CONVERSOES_CONFIAVEL, MIN_DIAS_RECOMENDADO } from '@/lib/estatistica'
import type { TesteAB, VarianteTeste } from '@/lib/types'

const STATUS_COR: Record<string, string> = {
  'Planejado':             'bg-gray-800 text-gray-400 border-gray-700',
  'Ativo':                 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Finalizado':            'bg-green-500/10 text-green-400 border-green-500/20',
  'Vencedor implementado': 'bg-green-500/10 text-green-400 border-green-500/20',
}

interface Metricas {
  sessoes: number
  conversoes: number
  receita: number
  sessoes_checkout: number
}

function metricasDe(v: VarianteTeste): Metricas {
  return {
    sessoes: v.sessoes ?? 0,
    conversoes: v.conversoes ?? 0,
    receita: v.receita ?? 0,
    sessoes_checkout: v.sessoes_checkout ?? 0,
  }
}

function taxaConversao(m: Metricas): number {
  return m.sessoes > 0 ? (m.conversoes / m.sessoes) * 100 : 0
}

function formatarMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function deltaPct(valor: number, base: number): string | null {
  if (base <= 0) return null
  const pct = ((valor - base) / base) * 100
  const sinal = pct >= 0 ? '+' : ''
  return `${sinal}${pct.toFixed(1)}%`
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

function diasDeTeste(dataInicio?: string | null, dataFim?: string | null): number | null {
  if (!dataInicio) return null
  const fim = dataFim ? new Date(dataFim) : new Date()
  return Math.max(0, Math.round((fim.getTime() - new Date(dataInicio).getTime()) / 86400000))
}

const CONFIANCA_COR: Record<string, string> = {
  'Alta': 'text-green-400',
  'Média': 'text-amber-400',
  'Baixa': 'text-gray-400',
}

const LIMITE_HIPOTESE = 200

const LAYOUT_LABEL: Record<string, string> = { curto: 'Curto', longo: 'Longo' }

interface Props {
  teste: TesteAB
}

export function DetalheTesteAB({ teste: testeInicial }: Props) {
  const [teste, setTeste] = useState(testeInicial)
  const [metricas, setMetricas] = useState<Record<string, Metricas>>(() =>
    Object.fromEntries((testeInicial.variantes_teste ?? []).map(v => [v.id, metricasDe(v)]))
  )
  const [editando, setEditando] = useState<string | null>(null)
  const [salvandoMetricas, setSalvandoMetricas] = useState<string | null>(null)
  const [aprendizado, setAprendizado] = useState(teste.resultado ?? '')
  const [salvandoAprendizado, setSalvandoAprendizado] = useState(false)
  const [hipotese, setHipotese] = useState(teste.hipotese ?? '')
  const [hipoteseMotivo, setHipoteseMotivo] = useState(teste.hipotese_motivo ?? '')
  const [resultadoEsperado, setResultadoEsperado] = useState(teste.resultado_esperado ?? '')
  const [salvandoHipotese, setSalvandoHipotese] = useState(false)
  const [declarando, setDeclarando] = useState<string | null>(null)
  const [desfazendo, setDesfazendo] = useState(false)
  const [encerrando, setEncerrando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [erro, setErro] = useState('')
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null)

  const variantes = teste.variantes_teste ?? []
  const controle = variantes.find(v => v.is_controle)
  const vencedora = variantes.find(v => v.is_vencedor)
  const metricasControle = controle ? metricas[controle.id] : undefined

  const inputCls = 'w-full bg-gray-900 border-gray-800 text-white placeholder-gray-500 focus:border-indigo-500'
  const cardCls = 'bg-gray-900 border border-gray-800 rounded-xl p-6'

  async function salvarMetricas(varianteId: string) {
    setSalvandoMetricas(varianteId)
    setErro('')
    const m = metricas[varianteId]
    const res = await atualizarMetricasVariante({ id: varianteId, teste_id: teste.id, ...m })
    setSalvandoMetricas(null)
    if (!res.ok) { setErro(res.erro ?? 'Erro ao salvar métricas.'); return }
    setEditando(null)
  }

  async function salvarAprendizado() {
    setSalvandoAprendizado(true)
    const res = await atualizarAprendizado(teste.id, aprendizado)
    setSalvandoAprendizado(false)
    if (!res.ok) setErro(res.erro ?? 'Erro ao salvar aprendizado.')
  }

  async function salvarHipotese() {
    setSalvandoHipotese(true)
    const res = await atualizarHipotese(teste.id, {
      hipotese, hipotese_motivo: hipoteseMotivo, resultado_esperado: resultadoEsperado,
    })
    setSalvandoHipotese(false)
    if (!res.ok) setErro(res.erro ?? 'Erro ao salvar hipótese.')
  }

  async function marcarVencedora(varianteId: string) {
    setDeclarando(varianteId)
    setErro('')
    const res = await declararVencedora(teste.id, varianteId)
    setDeclarando(null)
    if (!res.ok) { setErro(res.erro ?? 'Erro ao declarar vencedora.'); return }
    setTeste(t => ({
      ...t,
      status: 'Finalizado',
      resultado_final: 'vencedora',
      variantes_teste: (t.variantes_teste ?? []).map(v => ({ ...v, is_vencedor: v.id === varianteId })),
    }))
  }

  async function handleEncerrarSemVencedor() {
    setEncerrando(true)
    setErro('')
    const res = await encerrarSemVencedor(teste.id)
    setEncerrando(false)
    if (!res.ok) { setErro(res.erro ?? 'Erro ao encerrar o teste.'); return }
    setTeste(t => ({
      ...t,
      status: 'Finalizado',
      resultado_final: 'sem_vencedor',
      variantes_teste: (t.variantes_teste ?? []).map(v => ({ ...v, is_vencedor: false })),
    }))
  }

  async function handleDesfazerVencedora() {
    setDesfazendo(true)
    setErro('')
    const res = await desfazerVencedora(teste.id)
    setDesfazendo(false)
    if (!res.ok) { setErro(res.erro ?? 'Erro ao desfazer declaração.'); return }
    setTeste(t => ({
      ...t,
      status: 'Ativo',
      data_fim: null,
      resultado_final: null,
      variantes_teste: (t.variantes_teste ?? []).map(v => ({ ...v, is_vencedor: false })),
    }))
  }

  async function handleAplicarVencedor() {
    setAplicando(true)
    const res = await aplicarVencedor(teste.id)
    setAplicando(false)
    if (!res.ok) { setErro(res.erro ?? 'Erro ao aplicar vencedor.'); return }
    setTeste(t => ({ ...t, status: 'Vencedor implementado' }))
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Breadcrumb + título */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-gray-500 mb-2 text-sm">
            <Link href="/variantes" className="hover:text-gray-300 transition-colors">Experimentos</Link>
            <ChevronRight size={14} />
            <span className="text-indigo-400 font-medium">{teste.nome}</span>
          </nav>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-mono text-gray-500 bg-gray-900 border border-gray-800 rounded px-2 py-0.5">
              #{teste.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COR[teste.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              {teste.status}
            </span>
            {teste.resultado_final === 'sem_vencedor' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-gray-800 text-gray-400 border border-gray-700 rounded-full px-2 py-0.5">
                Sem vencedor (empate/inconclusivo)
                <button
                  type="button"
                  onClick={handleDesfazerVencedora}
                  disabled={desfazendo}
                  className="underline decoration-dotted hover:text-red-400 disabled:opacity-40 transition-colors"
                >
                  {desfazendo ? 'Reabrindo...' : 'Reabrir'}
                </button>
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">{teste.nome}</h2>
          {teste.funis?.nome && (
            <p className="text-gray-500 text-sm mt-1">
              {teste.funis.id_funil && <span className="text-indigo-400 font-mono text-xs mr-1">[{teste.funis.id_funil}]</span>}
              {teste.funis.nome}
              {teste.paginas?.nome && (
                <span className="text-gray-600"> · Página: {teste.paginas.codigo && `[${teste.paginas.codigo}] `}{teste.paginas.nome}</span>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {teste.segmento && (
              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-gray-800 text-gray-300 border-gray-700">
                {teste.segmento}
              </span>
            )}
            {teste.campanhas?.codigo && (
              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-gray-800 text-gray-300 border-gray-700">
                {teste.campanhas.codigo}
              </span>
            )}
            {teste.elemento_testado && (
              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-gray-800 text-gray-300 border-gray-700">
                Testando: {teste.elemento_testado}
              </span>
            )}
            {(teste.especialistas?.nome || teste.responsavel) && (
              <span className="text-gray-500 text-xs">
                {[teste.especialistas?.nome, teste.responsavel].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {teste.status === 'Ativo' && !vencedora && (
            <Button
              variant="ghost"
              onClick={handleEncerrarSemVencedor}
              disabled={encerrando}
              className="text-gray-400 hover:text-white border border-gray-800 disabled:opacity-40"
            >
              {encerrando ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Encerrar sem vencedor
            </Button>
          )}
          {vencedora && teste.status !== 'Vencedor implementado' && (
            <Button
              onClick={handleAplicarVencedor}
              disabled={aplicando}
              className="bg-green-600 hover:bg-green-500 text-white disabled:opacity-40"
            >
              {aplicando ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trophy size={16} className="mr-2" />}
              Aplicar Vencedor
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Hipótese */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Brain size={16} className="text-indigo-400" /> Framework de Hipótese
            </h3>
            {salvandoHipotese && <span className="text-gray-600 text-xs">Salvando...</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-gray-500 text-xs">O QUE vamos mudar?</label>
              <Textarea
                value={hipotese}
                onChange={e => setHipotese(e.target.value)}
                onBlur={() => { if (hipotese !== (teste.hipotese ?? '')) salvarHipotese() }}
                placeholder="Ex: Reduzir o formulário de 3 campos para 2 (email + nome)"
                rows={4}
                className={`${inputCls} resize-none text-sm`}
              />
              <p className={`text-xs text-right ${hipotese.length > LIMITE_HIPOTESE ? 'text-amber-400' : 'text-gray-600'}`}>
                {hipotese.length}/{LIMITE_HIPOTESE}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-500 text-xs">POR QUE estamos mudando?</label>
              <Textarea
                value={hipoteseMotivo}
                onChange={e => setHipoteseMotivo(e.target.value)}
                onBlur={() => { if (hipoteseMotivo !== (teste.hipotese_motivo ?? '')) salvarHipotese() }}
                placeholder="Ex: Gravações mostram abandono alto no campo telefone"
                rows={4}
                className={`${inputCls} resize-none text-sm`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-500 text-xs">Resultado esperado</label>
              <Textarea
                value={resultadoEsperado}
                onChange={e => setResultadoEsperado(e.target.value)}
                onBlur={() => { if (resultadoEsperado !== (teste.resultado_esperado ?? '')) salvarHipotese() }}
                placeholder="Ex: Aumento de 15% na taxa de conversão do formulário"
                rows={4}
                className={`${inputCls} resize-none text-sm`}
              />
            </div>
          </div>
        </div>

        {/* Aprendizado */}
        <div className={cardCls}>
          <h3 className="text-gray-500 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-400" /> Aprendizado
          </h3>
          <Textarea
            value={aprendizado}
            onChange={e => setAprendizado(e.target.value)}
            onBlur={() => { if (aprendizado !== (teste.resultado ?? '')) salvarAprendizado() }}
            placeholder="O que esse teste ensinou? Registre aqui — esse campo é seu, não é gerado automaticamente."
            rows={3}
            className={`${inputCls} resize-none text-sm`}
          />
          {salvandoAprendizado && <p className="text-gray-600 text-xs mt-1">Salvando...</p>}
        </div>

        {/* Variantes */}
        <div className={`grid grid-cols-1 gap-4 ${variantes.length > 2 ? 'md:grid-cols-2' : 'md:grid-cols-2'}`}>
          {variantes.map(v => {
            const m = metricas[v.id] ?? metricasDe(v)
            const cr = taxaConversao(m)
            const crControle = metricasControle ? taxaConversao(metricasControle) : undefined
            const emEdicao = editando === v.id
            return (
              <div key={v.id} className={`${cardCls} ${v.is_vencedor ? 'border-green-500/40' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    {v.is_controle
                      ? <CheckCircle2 size={16} className="text-gray-400" />
                      : <Rocket size={16} className="text-indigo-400" />}
                    {v.nome}
                    {v.is_controle && <span className="text-xs text-gray-500 font-normal">(Controle)</span>}
                  </h3>
                  {v.is_vencedor && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">
                        <Trophy size={11} /> WINNER
                      </span>
                      <button
                        type="button"
                        onClick={handleDesfazerVencedora}
                        disabled={desfazendo}
                        className="text-[11px] text-gray-500 hover:text-red-400 underline decoration-dotted disabled:opacity-40 transition-colors"
                      >
                        {desfazendo ? 'Desfazendo...' : 'Desfazer'}
                      </button>
                    </div>
                  )}
                </div>

                {v.screenshot_url && ehArquivoHtml(v.screenshot_url) ? (
                  <button
                    type="button"
                    onClick={() => abrirReferenciaHtml(v.screenshot_url!)}
                    className="w-full rounded-lg border border-dashed border-gray-800 bg-gray-950 flex flex-col items-center justify-center h-32 mb-4 text-indigo-400 hover:border-indigo-500/40 transition-colors gap-1.5"
                  >
                    <FileCode2 size={22} />
                    <span className="text-xs">Abrir referência HTML ↗</span>
                  </button>
                ) : v.screenshot_url ? (
                  <button
                    type="button"
                    onClick={() => setImagemAmpliada(v.screenshot_url!)}
                    className="relative w-full mb-4 group"
                    title="Ampliar screenshot"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.screenshot_url} alt={`Screenshot ${v.nome}`} className="w-full aspect-[5/2] min-h-0 rounded-lg border border-gray-800 bg-gray-950 object-cover object-top" />
                    <span className="absolute top-2 right-2 p-1.5 bg-black/60 group-hover:bg-black/80 rounded-lg text-white transition-colors">
                      <ZoomIn size={14} />
                    </span>
                  </button>
                ) : (
                  <div className="w-full rounded-lg border border-dashed border-gray-800 bg-gray-950 flex items-center justify-center h-32 mb-4 text-gray-700">
                    <ImageOff size={20} />
                  </div>
                )}

                {(v.url_variante || v.url_preview) && (
                  <div className="space-y-1 mb-4">
                    {v.url_variante && (
                      <a href={v.url_variante} target="_blank" rel="noreferrer" className="text-indigo-400 text-xs hover:underline break-all block">
                        {v.url_variante}
                      </a>
                    )}
                    {v.url_preview && (
                      <a href={v.url_preview} target="_blank" rel="noreferrer" className="text-gray-500 text-xs hover:underline hover:text-gray-400 break-all block">
                        Preview ↗
                      </a>
                    )}
                  </div>
                )}

                {(v.layout || v.angulo_dominante || v.headline || v.subheadline) && (
                  <div className="space-y-1.5 mb-4 pb-4 border-b border-gray-800">
                    {v.layout && (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-gray-800 text-gray-300 border-gray-700">
                        Layout: {LAYOUT_LABEL[v.layout] ?? v.layout}
                      </span>
                    )}
                    {(v.angulo_dominante || (v.angulos_secundarios ?? []).length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {v.angulo_dominante && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500 font-medium">
                            <Star size={10} className="fill-indigo-300 text-indigo-300" /> {v.angulo_dominante}
                          </span>
                        )}
                        {(v.angulos_secundarios ?? []).map(a => (
                          <span key={a} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {v.headline && (
                      <p className="text-white text-sm font-medium leading-snug">{v.headline}</p>
                    )}
                    {v.subheadline && (
                      <p className="text-gray-500 text-xs leading-snug">{v.subheadline}</p>
                    )}
                  </div>
                )}

                {emEdicao ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-gray-500 text-[11px] uppercase">Sessões</label>
                        <Input type="number" min={0} value={m.sessoes}
                          onChange={e => setMetricas(s => ({ ...s, [v.id]: { ...m, sessoes: Number(e.target.value) } }))}
                          className={`${inputCls} h-9`} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-500 text-[11px] uppercase">Conversões</label>
                        <Input type="number" min={0} value={m.conversoes}
                          onChange={e => setMetricas(s => ({ ...s, [v.id]: { ...m, conversoes: Number(e.target.value) } }))}
                          className={`${inputCls} h-9`} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-500 text-[11px] uppercase">Receita (R$)</label>
                        <Input type="number" min={0} value={m.receita}
                          onChange={e => setMetricas(s => ({ ...s, [v.id]: { ...m, receita: Number(e.target.value) } }))}
                          className={`${inputCls} h-9`} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-500 text-[11px] uppercase">Início Checkout</label>
                        <Input type="number" min={0} value={m.sessoes_checkout}
                          onChange={e => setMetricas(s => ({ ...s, [v.id]: { ...m, sessoes_checkout: Number(e.target.value) } }))}
                          className={`${inputCls} h-9`} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => salvarMetricas(v.id)}
                        disabled={salvandoMetricas === v.id}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
                      >
                        {salvandoMetricas === v.id ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditando(null)} className="text-gray-400 hover:text-white">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] uppercase text-gray-600 mb-1">Conversões</p>
                        <p className="text-white font-semibold">{m.conversoes.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-600 mb-1">Taxa de Conversão</p>
                        <p className="text-white font-semibold">
                          {cr.toFixed(1)}%
                          {!v.is_controle && crControle !== undefined && deltaPct(cr, crControle) && (
                            <span className={`ml-1 text-xs ${cr >= crControle ? 'text-green-400' : 'text-red-400'}`}>
                              {deltaPct(cr, crControle)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-600 mb-1">Receita</p>
                        <p className="text-white font-semibold">{formatarMoeda(m.receita)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-600 mb-1">Início Checkout</p>
                        <p className="text-white font-semibold">{m.sessoes_checkout.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>

                    {!v.is_controle && controle && (() => {
                      const confianca = confiancaZTest(taxaConversao(metricasControle ?? metricasDe(controle)), (metricasControle ?? metricasDe(controle)).sessoes, cr, m.sessoes)
                      if (confianca === null) return null
                      const classificacao = classificarConfianca(confianca)
                      const dias = diasDeTeste(teste.data_inicio, teste.data_fim)
                      const amostraPequena = m.conversoes < MIN_CONVERSOES_CONFIAVEL || (metricasControle?.conversoes ?? 0) < MIN_CONVERSOES_CONFIAVEL
                      const testeCurto = dias !== null && dias < MIN_DIAS_RECOMENDADO
                      return (
                        <div className="mb-4 p-3 rounded-lg bg-gray-950 border border-gray-800">
                          <p className="text-[10px] uppercase text-gray-600 mb-1">Confiança estatística (vs. Controle)</p>
                          <p className={`font-semibold ${CONFIANCA_COR[classificacao]}`}>
                            {confianca.toFixed(1)}% <span className="text-xs font-normal">({classificacao})</span>
                          </p>
                          {(amostraPequena || testeCurto) && (
                            <p className="flex items-start gap-1.5 text-[11px] text-amber-500 mt-1.5">
                              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                              {amostraPequena && testeCurto
                                ? `Amostra pequena (< ${MIN_CONVERSOES_CONFIAVEL} conversões) e teste roda há só ${dias}d — resultado ainda pode mudar.`
                                : amostraPequena
                                ? `Amostra pequena (< ${MIN_CONVERSOES_CONFIAVEL} conversões) — resultado ainda pode mudar.`
                                : `Teste roda há só ${dias}d (recomendado ${MIN_DIAS_RECOMENDADO}d+) — cuidado com viés de dia da semana.`}
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setEditando(v.id)} className="flex-1 text-gray-400 hover:text-white border border-gray-800">
                        Editar métricas
                      </Button>
                      {!v.is_vencedor && (
                        <Button
                          variant="ghost"
                          onClick={() => marcarVencedora(v.id)}
                          disabled={declarando === v.id}
                          className="text-green-400 hover:text-green-300 border border-gray-800 disabled:opacity-40"
                        >
                          {declarando === v.id ? 'Marcando...' : 'Marcar vencedora'}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {erro && <p className="text-red-400 text-sm">{erro}</p>}

        {/* Tabela comparativa */}
        {variantes.length > 0 && (
          <div className={cardCls}>
            <h3 className="text-white font-medium mb-4">Métricas Detalhadas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-4 font-medium">Métrica</th>
                    {variantes.map(v => (
                      <th key={v.id} className="py-2 px-4 font-medium">
                        {v.nome}{v.is_controle ? ' (Controle)' : v.is_vencedor ? ' (Winner)' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  <tr>
                    <td className="py-3 pr-4 text-gray-400">Sessões</td>
                    {variantes.map(v => (
                      <td key={v.id} className="py-3 px-4 text-white">{(metricas[v.id]?.sessoes ?? 0).toLocaleString('pt-BR')}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-gray-400">Conversões</td>
                    {variantes.map(v => (
                      <td key={v.id} className="py-3 px-4 text-white">{(metricas[v.id]?.conversoes ?? 0).toLocaleString('pt-BR')}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-gray-400">Taxa de Conversão</td>
                    {variantes.map(v => {
                      const val = taxaConversao(metricas[v.id] ?? metricasDe(v))
                      return <td key={v.id} className={`py-3 px-4 font-medium ${v.is_vencedor ? 'text-green-400' : 'text-white'}`}>{val.toFixed(1)}%</td>
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-gray-400">Receita</td>
                    {variantes.map(v => (
                      <td key={v.id} className="py-3 px-4 text-white">{formatarMoeda(metricas[v.id]?.receita ?? 0)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-gray-400">Início de Checkout</td>
                    {variantes.map(v => (
                      <td key={v.id} className="py-3 px-4 text-white">{(metricas[v.id]?.sessoes_checkout ?? 0).toLocaleString('pt-BR')}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 text-xs mt-4">
              Nível de confiança do teste: {teste.nivel_confianca ?? 95}% · Poder estatístico: {teste.poder_estatistico ?? 80}%
            </p>
          </div>
        )}
      </div>

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
