'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarPagina, atualizarPagina } from '@/lib/actions/paginas'
import type { Pagina, Funil, Configuracao, Estrategia } from '@/lib/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  pagina?: Pagina | null
  funis: Funil[]
  configs: Configuracao[]
  estrategias: Estrategia[]
  funilPreSelecionado?: string
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
  funil_id: '', nome: '', etapa: '', ferramenta: '', status: 'A fazer',
  prioridade: '', responsavel: '', url_pagina: '', referencia_dev: '',
  horas_estimadas: '', horas_reais: '', data_prevista: '',
  url_planilha_pesquisa: '', url_documentacao: '',
  observacoes: '', estrategia_id: '',
}

const ETAPAS_TYP = ['TYP', 'Obrigado']

export function ModalPagina({ aberto, onFechar, onSalvo, pagina, funis, configs, estrategias, funilPreSelecionado }: Props) {
  const [form, setForm] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (pagina) {
      setForm({
        funil_id: pagina.funil_id,
        nome: pagina.nome,
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
      setForm({ ...VAZIO, funil_id: funilPreSelecionado ?? '' })
    }
    setErro('')
  }, [pagina, funilPreSelecionado, aberto])

  const set = (field: string) => (value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const configOpts = (cat: string) =>
    configs.filter(c => c.categoria === cat && c.ativo).map(c => ({ valor: c.valor }))

  const isTYP = ETAPAS_TYP.includes(form.etapa)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.funil_id || !form.nome || !form.status) {
      setErro('Funil, nome e status são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        funil_id: form.funil_id,
        nome: form.nome,
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
        estrategia_id: form.estrategia_id || null,
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
          {/* Funil + Nome — sempre visíveis */}
          <Select
            label="Funil *"
            value={form.funil_id}
            onChange={v => { set('funil_id')(v); set('estrategia_id')('') }}
            obrigatorio
            options={funis.map(f => ({ valor: f.id, label: `${f.id_funil && f.id_funil !== f.nome ? `[${f.id_funil}] ` : ''}${f.nome}` }))}
          />
          {(() => {
            const opts = estrategias.filter(e => e.funil_id === form.funil_id)
            if (!opts.length) return null
            return (
              <Select
                label="Estratégia"
                value={form.estrategia_id}
                onChange={set('estrategia_id')}
                options={opts.map(e => ({ valor: e.id, label: e.nome }))}
              />
            )
          })()}
          <Field label="Nome da Página *" value={form.nome} onChange={set('nome')} placeholder="Ex: A, Halo B, VSL longa, Confirmação" />

          {/* Campos essenciais — sempre visíveis */}
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
