'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Copy } from 'lucide-react'
import { criarVariante } from '@/lib/actions/paginas'
import type { Pagina } from '@/lib/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  onCriada: () => void
  pagina: Pagina | null
  todasPaginas: Pagina[]
}

const ELEMENTO = [
  { id: 'headline', label: 'Headline / título principal' },
  { id: 'subheadline', label: 'Subheadline / argumento de apoio' },
  { id: 'bullets', label: 'Bullets / lista de benefícios' },
  { id: 'cta', label: 'Botão / CTA' },
]

const ESTRUTURA = [
  { id: 'layout', label: 'Layout / estrutura visual' },
  { id: 'hero', label: 'Hero — formato, imagem, vídeo' },
  { id: 'comprimento', label: 'Comprimento — curta ↔ longa' },
  { id: 'oferta', label: 'Oferta / promessa principal' },
]

const IDS_ESTRUTURA = new Set(['layout', 'hero', 'comprimento', 'oferta'])

function parsearInfo(pagina: Pagina): { base: string; slugRaiz: string; variante: string | null; versao: number } {
  const url = pagina.url_pagina

  if (pagina.slug_raiz) {
    const base = url ? (() => {
      try {
        const p = new URL(url)
        const parts = p.pathname.split('/').filter(Boolean).slice(0, -1)
        return `${p.origin}/${parts.join('/')}${parts.length > 0 ? '/' : ''}`
      } catch { return '' }
    })() : ''
    return { base, slugRaiz: pagina.slug_raiz, variante: pagina.variante ?? null, versao: pagina.versao ?? 1 }
  }

  if (!url) return { base: '', slugRaiz: '', variante: null, versao: 1 }
  try {
    const p = new URL(url)
    const parts = p.pathname.split('/').filter(Boolean)
    const last = parts[parts.length - 1]
    const baseParts = parts.slice(0, -1)
    const base = `${p.origin}/${baseParts.join('/')}${baseParts.length > 0 ? '/' : ''}`

    // Slug é só letra de variante: /a, /b
    const mLetra = last.match(/^([a-z])$/)
    if (mLetra) return { base, slugRaiz: '', variante: mLetra[1], versao: 1 }

    // Slug é letra + versão: /a-v2
    const mLetraV = last.match(/^([a-z])-v(\d+)$/)
    if (mLetraV) return { base, slugRaiz: '', variante: mLetraV[1], versao: parseInt(mLetraV[2]) }

    // Slug composto com letra e versão: /cadastro-a-v2
    const m3 = last.match(/^(.*)-([a-z])-v(\d+)$/)
    if (m3) return { base, slugRaiz: m3[1], variante: m3[2], versao: parseInt(m3[3]) }

    // Legacy sem padrão detectável
    return { base, slugRaiz: last, variante: null, versao: 1 }
  } catch {
    return { base: '', slugRaiz: url, variante: null, versao: 1 }
  }
}

function proximaLetra(varianteAtual: string | null, existentes: string[]): string {
  const todas = varianteAtual ? [...existentes, varianteAtual] : existentes
  if (todas.length === 0) return 'b'
  const max = [...todas].sort().reverse()[0]
  return String.fromCharCode(max.charCodeAt(0) + 1)
}

function montarSlug(slugRaiz: string, variante: string | null, versao: number): string {
  if (!slugRaiz) {
    // Slug puro de variante: /a, /b, /a-v2
    if (!variante) return ''
    return versao > 1 ? `${variante}-v${versao}` : variante
  }
  if (!variante) return versao > 1 ? `${slugRaiz}-v${versao}` : slugRaiz
  return versao > 1 ? `${slugRaiz}-${variante}-v${versao}` : `${slugRaiz}-${variante}`
}

export function ModalVariante({ aberto, onFechar, onCriada, pagina, todasPaginas }: Props) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [urlEditada, setUrlEditada] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  const copiar = useCallback(() => {
    if (!urlEditada) return
    navigator.clipboard.writeText(urlEditada).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }, [urlEditada])

  const info = useMemo(() => pagina ? parsearInfo(pagina) : null, [pagina])

  const isEstrutura = Array.from(selecionadas).some(id => IDS_ESTRUTURA.has(id))
  const temSelecao = selecionadas.size > 0

  const sugestao = useMemo(() => {
    if (!info || !pagina || !temSelecao) return null
    const { base, slugRaiz, variante, versao } = info

    const irmas = todasPaginas.filter(p =>
      p.id !== pagina.id &&
      p.funil_id === pagina.funil_id &&
      (p.slug_raiz ?? null) === (slugRaiz || null)
    )

    let novaVariante: string | null
    let novaVersao: number

    const urlExiste = (u: string) => todasPaginas.some(p => p.id !== pagina.id && p.url_pagina === u)
    const buildUrl = (s: string) => base ? `${base.replace(/\/$/, '')}/${s}` : s

    let aviso: string | null = null

    if (isEstrutura) {
      const letras = irmas.map(p => p.variante).filter((v): v is string => !!v)
      novaVariante = proximaLetra(variante, letras)
      novaVersao = 1

      let slug = montarSlug(slugRaiz, novaVariante, novaVersao)
      let url = buildUrl(slug)
      while (urlExiste(url)) {
        const pulada = novaVariante
        novaVariante = String.fromCharCode(novaVariante!.charCodeAt(0) + 1)
        aviso = `/${montarSlug(slugRaiz, pulada, 1)} já existe`
        slug = montarSlug(slugRaiz, novaVariante, novaVersao)
        url = buildUrl(slug)
      }
      return { slug, novaVariante, novaVersao, url, aviso }
    } else {
      // Legacy sem letra: trata original como "a" para manter consistência com mudança estrutural
      novaVariante = variante ?? 'a'
      const versoes = irmas
        .filter(p => (p.variante ?? 'a') === novaVariante)
        .map(p => p.versao ?? 1)
      novaVersao = Math.max(versao, ...(versoes.length > 0 ? versoes : [0])) + 1

      let slug = montarSlug(slugRaiz, novaVariante, novaVersao)
      let url = buildUrl(slug)
      while (urlExiste(url)) {
        aviso = `/${montarSlug(slugRaiz, novaVariante, novaVersao)} já existe`
        novaVersao++
        slug = montarSlug(slugRaiz, novaVariante, novaVersao)
        url = buildUrl(slug)
      }
      return { slug, novaVariante, novaVersao, url, aviso }
    }
  }, [info, isEstrutura, temSelecao, todasPaginas, pagina])

  useEffect(() => {
    if (aberto) {
      setSelecionadas(new Set())
      setErro('')
      setUrlEditada('')
    }
  }, [aberto, pagina])

  useEffect(() => {
    if (sugestao) setUrlEditada(sugestao.url)
  }, [sugestao])

  function toggle(id: string) {
    setSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const urlDuplicada = !!urlEditada && todasPaginas.some(p =>
    p.id !== pagina?.id && p.url_pagina === urlEditada
  )

  async function handleSubmit() {
    if (!pagina || !temSelecao || !sugestao || !info) return
    setSalvando(true)
    setErro('')
    try {
      await criarVariante({
        paginaOrigemId: pagina.id,
        urlPagina: urlEditada,
        slugRaiz: info.slugRaiz,
        variante: sugestao.novaVariante,
        versao: sugestao.novaVersao,
        oQueMudou: Array.from(selecionadas.values()),
      })
      onCriada()
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar variante.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Criar variante — <span className="text-indigo-400">{pagina?.nome}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {pagina?.url_pagina && (
            <p className="text-xs text-gray-500 break-all">
              Original: <span className="text-gray-400 font-mono">{pagina.url_pagina}</span>
            </p>
          )}

          {/* Checklist */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5">
                Mudança de elemento
                <span className="ml-2 normal-case font-normal text-gray-600">→ mesma variante, sobe versão</span>
              </p>
              <div className="space-y-2">
                {ELEMENTO.map(m => (
                  <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selecionadas.has(m.id)}
                      onChange={() => toggle(m.id)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-950 text-indigo-500 focus:ring-0 focus:ring-offset-0 accent-indigo-500"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5">
                Mudança de estrutura
                <span className="ml-2 normal-case font-normal text-gray-600">→ nova letra de variante</span>
              </p>
              <div className="space-y-2">
                {ESTRUTURA.map(m => (
                  <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selecionadas.has(m.id)}
                      onChange={() => toggle(m.id)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-950 text-indigo-500 focus:ring-0 focus:ring-offset-0 accent-indigo-500"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Resultado */}
          {temSelecao && sugestao && (
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  isEstrutura
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                    : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {isEstrutura
                    ? `Nova variante ${sugestao.novaVariante?.toUpperCase()}`
                    : `Versão v${sugestao.novaVersao}`}
                </span>
                <span className="text-xs text-gray-600">
                  slug: <span className="text-gray-400 font-mono">{sugestao.slug}</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">
                  URL gerada <span className="text-gray-600">(editável)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={urlEditada}
                    onChange={e => setUrlEditada(e.target.value)}
                    placeholder="https://..."
                    className={`bg-gray-950 border text-white text-sm font-mono placeholder-gray-600 focus:border-indigo-500 ${
                      urlDuplicada ? 'border-red-500' : 'border-gray-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={copiar}
                    disabled={!urlEditada}
                    className="shrink-0 p-2 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-30"
                    title="Copiar URL"
                  >
                    {copiado ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                {sugestao.aviso && !urlDuplicada && (
                  <p className="text-xs text-yellow-500/80">Variantes anteriores já existem — usando a próxima disponível.</p>
                )}
                {urlDuplicada && (
                  <p className="text-xs text-red-400">Esta URL já existe — edite antes de salvar.</p>
                )}
                {info && info.variante === null && info.slugRaiz && (
                  <p className="text-xs text-gray-600">Página sem variante definida — ajuste a URL se necessário.</p>
                )}
              </div>
            </div>
          )}

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onFechar} className="text-gray-400 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={salvando || !temSelecao || urlDuplicada || !sugestao}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {salvando ? 'Criando...' : 'Criar variante'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
