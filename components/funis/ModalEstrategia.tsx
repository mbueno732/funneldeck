'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { criarEstrategia, atualizarEstrategia } from '@/lib/actions/estrategias'
import type { Estrategia } from '@/lib/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: (estrategia: Estrategia) => void
  funilId: string
  estrategia?: Estrategia | null
}

export function ModalEstrategia({ aberto, onFechar, onSalvo, funilId, estrategia }: Props) {
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setNome(estrategia?.nome ?? '')
      setErro('')
    }
  }, [aberto, estrategia])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    try {
      let resultado: Estrategia
      if (estrategia) {
        resultado = await atualizarEstrategia(estrategia.id, { nome: nome.trim() })
      } else {
        resultado = await criarEstrategia({ funil_id: funilId, nome: nome.trim() })
      }
      onSalvo(resultado)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {estrategia ? 'Editar estratégia' : 'Nova estratégia'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Nome *</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Captação Normal, Aplicação..."
              className="bg-gray-900 border-gray-800 text-white placeholder-gray-600 focus:border-indigo-500"
              autoFocus
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onFechar} className="text-gray-400 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {salvando ? 'Salvando...' : estrategia ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
