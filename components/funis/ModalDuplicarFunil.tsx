'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy } from 'lucide-react'
import { duplicarFunil } from '@/lib/actions/funis'
import type { Funil, Produto, Especialista } from '@/lib/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  funil: Funil | null
  produtos: Produto[]
  especialistas: Especialista[]
}

export function ModalDuplicarFunil({ aberto, onFechar, onSalvo, funil, produtos, especialistas }: Props) {
  const [nome, setNome] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [incluirPaginas, setIncluirPaginas] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (funil && aberto) {
      setNome(funil.nome ? `Cópia de ${funil.nome}` : '')
      setProdutoId(funil.produto_id ?? '')
      setIncluirPaginas(true)
      setErro('')
    }
  }, [funil, aberto])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!funil || !nome.trim()) return
    setSalvando(true)
    setErro('')
    try {
      await duplicarFunil(funil.id, {
        nome: nome.trim(),
        incluir_paginas: incluirPaginas,
        produto_id: produtoId || undefined,
      })
      onSalvo()
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao duplicar.')
    } finally {
      setSalvando(false)
    }
  }

  if (!funil) return null

  return (
    <Dialog open={aberto} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Copy size={16} className="text-indigo-400" />
            Duplicar Funil
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1 p-3 bg-gray-900/60 rounded-lg border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Duplicando</p>
          <p className="text-white font-medium">
            {funil.id_funil && <span className="text-indigo-400 font-mono mr-2">[{funil.id_funil}]</span>}
            {funil.nome}
          </p>
          {funil.produtos && (funil.produtos as { especialistas?: { nome: string } }).especialistas?.nome && (
            <p className="text-xs text-gray-500 mt-0.5">
              {(funil.produtos as { especialistas?: { nome: string } }).especialistas?.nome}
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Novo funil</p>

        <form onSubmit={handleSubmit} className="space-y-4 -mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Nome *</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do novo funil"
              required
              className="bg-gray-900 border-gray-800 text-white placeholder-gray-600 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Produto <span className="text-gray-600">(opcional)</span></Label>
            <Select value={produtoId || '__none__'} onValueChange={v => setProdutoId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-full bg-gray-900 border-gray-800 text-white focus:ring-0 focus:ring-offset-0 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="__none__" className="text-gray-300 focus:bg-gray-800 focus:text-white">Sem produto vinculado</SelectItem>
                {especialistas.flatMap(esp => {
                  const prods = produtos.filter(p => p.especialista_id === esp.id && p.ativo)
                  if (!prods.length) return []
                  return [
                    <SelectItem key={`esp-${esp.id}`} value={`__esp_${esp.id}`} disabled className="text-gray-500 text-xs font-semibold uppercase tracking-wide cursor-default">{esp.nome}</SelectItem>,
                    ...prods.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-gray-300 focus:bg-gray-800 focus:text-white pl-4">{p.nome}</SelectItem>
                    ))
                  ]
                })}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
            <input
              type="checkbox"
              checked={incluirPaginas}
              onChange={e => setIncluirPaginas(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-orange-500 shrink-0"
            />
            <div>
              <p className="text-sm text-white font-medium">Incluir páginas</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Todas as páginas serão copiadas com status &quot;A fazer&quot; e URLs zeradas.
              </p>
            </div>
          </label>

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onFechar} className="text-gray-400 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Copy size={14} />
              {salvando ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
