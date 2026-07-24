'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { atualizarPagina } from '@/lib/actions/paginas'
import type { Pagina } from '@/lib/types'

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F']

interface Props {
  pagina: Pagina | null
  onFechar: () => void
  onSalvo: (id: string, update: Partial<Pagina>) => void
}

export function ModalScoreManual({ pagina, onFechar, onSalvo }: Props) {
  const [grade, setGrade] = useState('')
  const [pct, setPct] = useState('')
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (pagina) {
      setGrade(pagina.score_manual_grade ?? '')
      setPct(pagina.score_manual_pct != null ? String(pagina.score_manual_pct) : '')
      setNota(pagina.score_manual_nota ?? '')
      setErro('')
    }
  }, [pagina])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pagina) return
    if (!grade && !pct) { setErro('Informe ao menos a letra ou a porcentagem.'); return }
    setSalvando(true)
    setErro('')
    try {
      const update: Partial<Pagina> = {
        score_manual_grade: grade || null,
        score_manual_pct: pct ? Number(pct) : null,
        score_manual_nota: nota.trim() || null,
        score_manual_data: new Date().toISOString().split('T')[0],
      }
      await atualizarPagina(pagina.id, update)
      onSalvo(pagina.id, update)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemover() {
    if (!pagina) return
    setSalvando(true)
    setErro('')
    try {
      const update: Partial<Pagina> = {
        score_manual_grade: null,
        score_manual_pct: null,
        score_manual_nota: null,
        score_manual_data: null,
      }
      await atualizarPagina(pagina.id, update)
      onSalvo(pagina.id, update)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover.')
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500'
  const temRegistro = !!(pagina?.score_manual_grade || pagina?.score_manual_pct)

  return (
    <Dialog open={!!pagina} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Score manual da página</DialogTitle>
        </DialogHeader>
        <p className="text-slate-500 text-xs -mt-2">
          Para páginas que o GTmetrix não consegue analisar (ex: muito grandes). Some sozinho da
          exibição assim que uma análise automática do GTmetrix existir.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Letra (A–F)</Label>
              <Select value={grade || '__none__'} onValueChange={v => setGrade(v === '__none__' ? '' : v)}>
                <SelectTrigger className={`w-full h-10 ${inputCls}`}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="__none__" className="text-slate-400 focus:bg-slate-800 focus:text-white">—</SelectItem>
                  {GRADES.map(g => (
                    <SelectItem key={g} value={g} className="text-slate-300 focus:bg-slate-800 focus:text-white">{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Porcentagem</Label>
              <Input
                type="number" min={0} max={100} value={pct}
                onChange={e => setPct(e.target.value)}
                placeholder="Ex: 85"
                className={`h-10 ${inputCls}`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs">Nota / observação</Label>
            <Textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder='Ex: "Página grande demais p/ GTmetrix — validado visualmente em 20/07"'
              rows={3}
              className={`${inputCls} resize-none text-sm`}
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <div className="flex justify-between items-center gap-2 pt-1">
            {temRegistro ? (
              <button
                type="button"
                onClick={handleRemover}
                disabled={salvando}
                className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-40 transition-colors"
              >
                Remover registro manual
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onFechar} className="text-slate-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
