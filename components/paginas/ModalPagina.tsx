'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarPagina, atualizarPagina } from '@/lib/actions/paginas'
import type { Pagina, Funil, Configuracao, Estrategia, Produto } from '@/lib/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  pagina?: Pagina | null
  funis: Funil[]
  configs: Configuracao[]
  estrategias: Estrategia[]
  produtos: Produto[]
  funilPreSelecionado?: string
  produtoPreSelecionado?: string
}

function Select({ label, value, onChange, options, obrigatorio }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { valor: string; label?: string }[]
  obrigatorio?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-400 text-xs">{label}{obrigatorio && ' *'}</Label>
      <ShadSelect value={value || '__none__'} onValueChange={v => onChange(v === '__none__' ? '' : v)}>
        <SelectTrigger className="w-full bg-gray-900 border-gray-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-800">
          <SelectItem value="__none__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Selecionar...</SelectItem>
          {options.map(o => (
            <SelectItem key={o.valor} value={o.valor} className="text-gray-300 focus:bg-gray-800 focus:text-white">{o.label ?? o.valor}</SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-400 text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-gray-900 border-gray-800 text-white placeholder-gray-600 focus:border-indigo-500"
      />
    </div>
  )
}

const DESCRICOES_TIPO: Record<string, string> = {
  'Captura':            'Coleta de leads ou inscrições simples',
  'Inscrições Abertas': 'Página de vendas do lançamento',
  'Lista de Espera':    'Pré-inscrição antes da abertura das vagas',
  'Obrigado':           'Confirmação após cadastro ou compra',
  'Vendas':             'Oferta direta de produto ou serviço',
  'OTO':                'Oferta única apresentada logo após a compra',
  'Análise de Crédito': 'Qualificação financeira do lead',
  'Compra Aprovada':    'Confirmação de pagamento aprovado',
  'Boleto Gerado':      'Instrução de pagamento via boleto',
  'Aplicação':          'Formulário de candidatura ou triagem do lead',
  'Checkin':            'Confirmação de presença em evento ou aula',
  'Cadastro':           'Registro em plataforma ou área de membros',
  'Material':           'Entrega de conteúdo ou material gratuito',
}

function computeNome(funcao: string, variante: string): string {
  if (!funcao || funcao === '__none__') return ''
  return variante.trim() ? `${funcao} - ${variante.trim()}` : funcao
}

function parseName(nome: string, funcaoOpts: string[]): { funcao: string; variante: string } {
  const sep = ' - '
  const idx = nome.indexOf(sep)
  if (idx > 0) {
    const possibleFuncao = nome.substring(0, idx)
    const possibleVariante = nome.substring(idx + sep.length)
    if (funcaoOpts.includes(possibleFuncao)) {
      return { funcao: possibleFuncao, variante: possibleVariante }
    }
  }
  if (funcaoOpts.includes(nome)) {
    return { funcao: nome, variante: '' }
  }
  // Nome fora do padrão: deixa vazio para forçar o usuário a escolher um tipo
  return { funcao: '', variante: '' }
}

function parseHoras(val: string): number | null {
  if (!val?.trim()) return null
  const v = val.trim().toLowerCase()
  const hm = v.match(/^(\d+)h(\d+)m?$/)
  if (hm) return parseFloat(hm[1]) + parseInt(hm[2]) / 60
  const h = v.match(/^(\d+(?:[.,]\d+)?)h$/)
  if (h) return parseFloat(h[1].replace(',', '.'))
  const m = v.match(/^(\d+)(?:m|min)$/)
  if (m) return parseInt(m[1]) / 60
  const colon = v.match(/^(\d+):(\d+)$/)
  if (colon) return parseInt(colon[1]) + parseInt(colon[2]) / 60
  const num = parseFloat(v.replace(',', '.'))
  return isNaN(num) || num < 0 ? null : num
}

function formatHoras(val: number | null | undefined): string {
  if (val == null) return ''
  const h = Math.floor(val)
  const m = Math.round((val - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h${m}`
}

const VAZIO = {
  escopo: 'funil' as 'funil' | 'produto',
  funil_id: '', produto_id: '',
  funcao: '', variante: '',
  etapa: '', ferramenta: '', status: 'A fazer',
  prioridade: '', responsavel: '', url_pagina: '', referencia_dev: '',
  horas_estimadas: '', horas_reais: '', data_prevista: '',
  url_planilha_pesquisa: '', url_documentacao: '',
  observacoes: '', estrategia_id: '',
}

const ETAPAS_TYP = ['TYP', 'Obrigado']

export function ModalPagina({ aberto, onFechar, onSalvo, pagina, funis, configs, estrategias, produtos, funilPreSelecionado, produtoPreSelecionado }: Props) {
  const [form, setForm] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')


  useEffect(() => {
    if (pagina) {
      const opts = configs.filter(c => c.categoria === 'funcao_pagina' && c.ativo).map(c => c.valor)
      const parsed = parseName(pagina.nome, opts)
      setForm({
        escopo: pagina.produto_id ? 'produto' : 'funil',
        funil_id: pagina.funil_id ?? '',
        produto_id: pagina.produto_id ?? '',
        funcao: parsed.funcao,
        variante: parsed.variante,
        etapa: pagina.etapa ?? '',
        ferramenta: pagina.ferramenta ?? '',
        status: pagina.status,
        prioridade: pagina.prioridade ?? '',
        responsavel: pagina.responsavel ?? '',
        url_pagina: pagina.url_pagina ?? '',
        referencia_dev: pagina.referencia_dev ?? '',
        horas_estimadas: formatHoras(pagina.horas_estimadas),
        horas_reais: formatHoras(pagina.horas_reais),
        data_prevista: pagina.data_prevista ?? '',
        url_planilha_pesquisa: pagina.url_planilha_pesquisa ?? '',
        url_documentacao: pagina.url_documentacao ?? '',
        observacoes: pagina.observacoes ?? '',
        estrategia_id: pagina.estrategia_id ?? '',
      })
    } else {
      const escopo: 'funil' | 'produto' = produtoPreSelecionado ? 'produto' : 'funil'
      setForm({ ...VAZIO, escopo, funil_id: funilPreSelecionado ?? '', produto_id: produtoPreSelecionado ?? '' })
    }
    setErro('')
  }, [pagina, funilPreSelecionado, produtoPreSelecionado, aberto])

  const set = (field: string) => (value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const configOpts = (cat: string) =>
    configs.filter(c => c.categoria === cat && c.ativo).map(c => ({ valor: c.valor }))

  const isTYP = ETAPAS_TYP.includes(form.etapa)

  const funilSelecionado = funis.find(f => f.id === form.funil_id)
  const produtoDoFunil = funilSelecionado?.produto_id
    ? produtos.find(p => p.id === funilSelecionado.produto_id)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.escopo === 'funil' && !form.funil_id) {
      setErro('Selecione um funil.')
      return
    }
    if (form.escopo === 'produto' && !form.produto_id) {
      setErro('Selecione um produto.')
      return
    }
    const nomeComputado = computeNome(form.funcao, form.variante)
    if (!nomeComputado) {
      setErro('Selecione a função da página.')
      return
    }
    if (!form.status) {
      setErro('Status é obrigatório.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        funil_id: form.escopo === 'funil' ? form.funil_id : null,
        produto_id: form.escopo === 'produto' ? form.produto_id : null,
        nome: nomeComputado,
        etapa: form.etapa || null,
        ferramenta: form.ferramenta || null,
        status: form.status,
        prioridade: form.prioridade || null,
        responsavel: form.responsavel || null,
        url_pagina: form.url_pagina || null,
        referencia_dev: form.referencia_dev || null,
        horas_estimadas: parseHoras(form.horas_estimadas),
        horas_reais: parseHoras(form.horas_reais),
        data_prevista: form.data_prevista || null,
        url_planilha_pesquisa: isTYP ? (form.url_planilha_pesquisa || null) : null,
        url_documentacao: form.url_documentacao || null,
        observacoes: form.observacoes || null,
        estrategia_id: form.escopo === 'funil' ? (form.estrategia_id || null) : null,
      }
      if (pagina) {
        await atualizarPagina(pagina.id, payload)
      } else {
        await criarPagina(payload as Parameters<typeof criarPagina>[0])
      }
      onSalvo()
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const isEdit = !!pagina

  return (
    <Dialog open={aberto} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEdit ? 'Editar Página' : 'Nova Página'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Tipo da página */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-xs">Tipo da página *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['funil', 'produto'] as const).map(op => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, escopo: op, funil_id: '', produto_id: '', estrategia_id: '' }))}
                  className={`flex flex-col items-start px-4 py-3 rounded-lg border transition-colors text-left ${
                    form.escopo === op
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {op === 'funil' ? 'Página do funil' : 'Página do produto'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Seletor contextual */}
          {form.escopo === 'funil' ? (
            <>
              <Select
                label="Funil *"
                value={form.funil_id}
                onChange={v => { set('funil_id')(v); set('estrategia_id')('') }}
                obrigatorio
                options={funis.map(f => ({ valor: f.id, label: `${f.id_funil && f.id_funil !== f.nome ? `[${f.id_funil}] ` : ''}${f.nome}` }))}
              />
              {produtoDoFunil && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-xs text-indigo-400">Produto vendido:</span>
                  <span className="text-xs font-medium text-indigo-300">{produtoDoFunil.nome}</span>
                </div>
              )}
              {(() => {
                const opts = estrategias.filter(e => e.funil_id === form.funil_id)
                if (!opts.length) return null
                return (
                  <div className="space-y-1">
                    <Select
                      label="Estratégia"
                      value={form.estrategia_id}
                      onChange={set('estrategia_id')}
                      options={opts.map(e => ({ valor: e.id, label: e.nome }))}
                    />
                    <p className="text-xs text-gray-600">Caminhos alternativos do funil. Deixe em branco se a página for comum a todos.</p>
                  </div>
                )
              })()}
            </>
          ) : (
            <Select
              label="Produto *"
              value={form.produto_id}
              onChange={set('produto_id')}
              obrigatorio
              options={produtos.map(p => ({ valor: p.id, label: p.nome }))}
            />
          )}

          {/* Nome da página */}
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Nome da página *</Label>
            <ShadSelect
              value={form.funcao || '__none__'}
              onValueChange={v => setForm(f => ({ ...f, funcao: v === '__none__' ? '' : v, variante: '' }))}
            >
              <SelectTrigger className="w-full bg-gray-900 border-gray-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__none__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Selecionar...</SelectItem>
                {configs.filter(c => c.categoria === 'funcao_pagina' && c.ativo).sort((a, b) => a.ordem - b.ordem).map(c => {
                  const desc = DESCRICOES_TIPO[c.valor]
                  return (
                    <SelectItem key={c.valor} value={c.valor} className="text-gray-300 focus:bg-gray-800 focus:text-white">
                      <div>
                        <div className="text-sm">{c.valor}</div>
                        {desc && <div className="text-xs text-gray-500 font-normal">{desc}</div>}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </ShadSelect>
          </div>

          {form.funcao && form.funcao !== '__none__' ? (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Variante</Label>
              <Input
                value={form.variante}
                onChange={e => setForm(f => ({ ...f, variante: e.target.value }))}
                placeholder="A, B, Flash Opening, CPP..."
                className="bg-gray-900 border-gray-800 text-white placeholder-gray-600 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-600">
                Nome: <span className="text-gray-400 font-medium">{computeNome(form.funcao, form.variante)}</span>
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Select label="Etapa" value={form.etapa} onChange={set('etapa')} options={configOpts('etapa')} />
            <Select label="Ferramenta" value={form.ferramenta} onChange={set('ferramenta')} options={configOpts('ferramenta')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status *" value={form.status} onChange={set('status')} obrigatorio options={configOpts('status_pagina')} />
            <Select label="Prioridade" value={form.prioridade} onChange={set('prioridade')} options={configOpts('prioridade')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Responsável" value={form.responsavel} onChange={set('responsavel')} options={configOpts('responsavel')} />
            <Field label="Data Prevista" value={form.data_prevista} onChange={set('data_prevista')} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horas Estimadas" value={form.horas_estimadas} onChange={set('horas_estimadas')} placeholder="ex: 2h, 1h30, 45m" />
            <Field label="Horas Reais" value={form.horas_reais} onChange={set('horas_reais')} placeholder="ex: 2h, 1h30, 45m" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="URL da Página" value={form.url_pagina} onChange={set('url_pagina')} type="url" placeholder="https://" />
            <Field label="Referência Dev" value={form.referencia_dev} onChange={set('referencia_dev')} type="url" placeholder="https://" />
          </div>
          <div className={`grid gap-3 ${isTYP ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isTYP && (
              <Field label="Planilha de Pesquisa" value={form.url_planilha_pesquisa} onChange={set('url_planilha_pesquisa')} type="url" placeholder="https://" />
            )}
            <Field label="Documentação" value={form.url_documentacao} onChange={set('url_documentacao')} type="url" placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={e => set('observacoes')(e.target.value)}
              placeholder="Notas, contexto, links adicionais..."
              className="bg-gray-900 border-gray-800 text-white placeholder-gray-600 focus:border-indigo-500 min-h-[80px]"
            />
          </div>

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onFechar} className="text-gray-400 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {salvando ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar página'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
