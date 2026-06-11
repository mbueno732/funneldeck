'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarFunil, atualizarFunil } from '@/lib/actions/funis'
import type { Funil, Produto, Especialista, Configuracao } from '@/lib/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  funil?: Funil | null
  produtos: Produto[]
  especialistas: Especialista[]
  configs: Configuracao[]
}

const VAZIO = {
  produto_id: '', nome: '', id_funil: '', tipo: '',
  status: 'Ativo', responsavel_cro: '', responsavel_dev: '',
  data_ativacao: '', planilha_leads: '', planilha_pesquisa: '',
}

export function ModalFunil({ aberto, onFechar, onSalvo, funil, produtos, especialistas, configs }: Props) {
  const [form, setForm] = useState(VAZIO)
  const [filtroEsp, setFiltroEsp] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [nomeAuto, setNomeAuto] = useState(true) // false quando usuário editou manualmente

  function gerarNome(id_funil: string, tipo: string, produto_id: string) {
    const produto = produtos.find(p => p.id === produto_id)
    if (tipo === 'Evergreen' && produto) return `Perpétuo ${produto.nome}`
    if (tipo === 'Webinar' && produto) return `Webinar ${produto.nome}`
    if (id_funil) return id_funil
    return ''
  }

  const set = (field: string) => (value: string) => setForm(f => ({ ...f, [field]: value }))

  const produtosFiltrados = filtroEsp
    ? produtos.filter(p => p.especialista_id === filtroEsp)
    : produtos

  const configOpts = (cat: string) =>
    configs.filter(c => c.categoria === cat && c.ativo).map(c => c.valor)

  useEffect(() => {
    if (funil) {
      setForm({
        produto_id: funil.produto_id ?? '',
        nome: funil.nome,
        id_funil: funil.id_funil ?? '',
        tipo: funil.tipo,
        status: funil.status,
        responsavel_cro: funil.responsavel_cro ?? '',
        responsavel_dev: funil.responsavel_dev ?? '',
        data_ativacao: funil.data_ativacao ?? '',
        planilha_leads: funil.planilha_leads ?? '',
        planilha_pesquisa: funil.planilha_pesquisa ?? '',
      })
      const prod = produtos.find(p => p.id === funil.produto_id)
      if (prod) setFiltroEsp(prod.especialista_id)
      setNomeAuto(false) // funil existente: não sobrescrever nome
    } else {
      setForm(VAZIO)
      setFiltroEsp('')
      setNomeAuto(true)
    }
    setErro('')
  }, [funil, aberto, produtos])

  function handleCampoGatilho(field: string, value: string) {
    setForm(f => {
      const updated = { ...f, [field]: value }
      if (nomeAuto) {
        updated.nome = gerarNome(
          field === 'id_funil' ? value : f.id_funil,
          field === 'tipo' ? value : f.tipo,
          field === 'produto_id' ? value : f.produto_id,
        )
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.tipo) {
      setErro('Nome e tipo são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        produto_id: form.produto_id || null,
        nome: form.nome,
        id_funil: form.id_funil || undefined,
        tipo: form.tipo,
        status: form.status,
        responsavel_cro: form.responsavel_cro || undefined,
        responsavel_dev: form.responsavel_dev || undefined,
        data_ativacao: form.data_ativacao || undefined,
        planilha_leads: form.planilha_leads || undefined,
        planilha_pesquisa: form.planilha_pesquisa || undefined,
      }
      if (funil) await atualizarFunil(funil.id, payload)
      else await criarFunil(payload)
      onSalvo()
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{funil ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Especialista → Produto */}
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Especialista</Label>
            <Select value={filtroEsp || '__all__'} onValueChange={v => { setFiltroEsp(v === '__all__' ? '' : v); set('produto_id')('') }}>
              <SelectTrigger className="w-full bg-gray-900 border-white/10 text-white focus:ring-0 focus:ring-offset-0 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="__all__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Todos</SelectItem>
                {especialistas.map(e => <SelectItem key={e.id} value={e.id} className="text-gray-300 focus:bg-gray-800 focus:text-white">{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Produto <span className="text-gray-600">(opcional)</span></Label>
            <Select value={form.produto_id || '__none__'} onValueChange={v => handleCampoGatilho('produto_id', v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-full bg-gray-900 border-white/10 text-white focus:ring-0 focus:ring-offset-0 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="__none__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Sem produto vinculado</SelectItem>
                {produtosFiltrados.map(p => <SelectItem key={p.id} value={p.id} className="text-gray-300 focus:bg-gray-800 focus:text-white">{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Código <span className="text-gray-600">(opcional)</span></Label>
              <Input
                value={form.id_funil}
                onChange={e => handleCampoGatilho('id_funil', e.target.value)}
                placeholder="Ex: MVA"
                className="bg-gray-900 border-white/10 text-white placeholder-gray-600 focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-gray-400 text-xs">Nome *</Label>
              <Input
                value={form.nome}
                onChange={e => { setNomeAuto(false); set('nome')(e.target.value) }}
                placeholder="Ex: Perpétuo Digital Go"
                required
                className="bg-gray-900 border-white/10 text-white placeholder-gray-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Tipo *</Label>
              <Select value={form.tipo || '__none__'} onValueChange={v => handleCampoGatilho('tipo', v === '__none__' ? '' : v)}>
                <SelectTrigger className="w-full bg-gray-900 border-white/10 text-white focus:ring-0 focus:ring-offset-0 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="__none__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Selecionar...</SelectItem>
                  {configOpts('tipo_funil').map(v => <SelectItem key={v} value={v} className="text-gray-300 focus:bg-gray-800 focus:text-white">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status')(v)}>
                <SelectTrigger className="w-full bg-gray-900 border-white/10 text-white focus:ring-0 focus:ring-offset-0 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {configOpts('status_funil').map(v => <SelectItem key={v} value={v} className="text-gray-300 focus:bg-gray-800 focus:text-white">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Responsável CRO</Label>
              <Input value={form.responsavel_cro} onChange={e => set('responsavel_cro')(e.target.value)} placeholder="Nome" className="bg-gray-900 border-white/10 text-white placeholder-gray-600 focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Responsável Dev</Label>
              <Input value={form.responsavel_dev} onChange={e => set('responsavel_dev')(e.target.value)} placeholder="Nome" className="bg-gray-900 border-white/10 text-white placeholder-gray-600 focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Data de Ativação</Label>
              <Input type="date" value={form.data_ativacao} onChange={e => set('data_ativacao')(e.target.value)} className="bg-gray-900 border-white/10 text-white focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Planilha de Leads</Label>
              <Input type="url" value={form.planilha_leads} onChange={e => set('planilha_leads')(e.target.value)} placeholder="https://" className="bg-gray-900 border-white/10 text-white placeholder-gray-600 focus:border-indigo-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Planilha de Pesquisa</Label>
            <Input type="url" value={form.planilha_pesquisa} onChange={e => set('planilha_pesquisa')(e.target.value)} placeholder="https://" className="bg-gray-900 border-white/10 text-white placeholder-gray-600 focus:border-indigo-500" />
          </div>

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onFechar} className="text-gray-400 hover:text-white">Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {salvando ? 'Salvando...' : funil ? 'Salvar alterações' : 'Criar funil'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
