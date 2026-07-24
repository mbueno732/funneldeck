'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, X, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { criarConfiguracao, atualizarConfiguracao, deletarConfiguracao } from '@/lib/actions/configuracoes'
import { DESCRICOES_TIPO_PAGINA } from '@/lib/descricoes-tipo-pagina'
import { GerenciarEspecialistas } from '@/components/especialistas/GerenciarEspecialistas'
import type { Configuracao, CategoriaConfig, Especialista } from '@/lib/types'

type AbaAtiva = CategoriaConfig | 'checklist' | 'especialistas'

const GRUPOS: { label: string; itens: { key: AbaAtiva; label: string }[] }[] = [
  {
    label: 'Negócio',
    itens: [
      { key: 'especialistas', label: 'Especialistas' },
    ],
  },
  {
    label: 'Páginas',
    itens: [
      { key: 'status_pagina', label: 'Status' },
      { key: 'etapa',         label: 'Etapas' },
      { key: 'funcao_pagina', label: 'Nome da página' },
      { key: 'ferramenta',    label: 'Ferramentas' },
      { key: 'prioridade',    label: 'Prioridades' },
    ],
  },
  {
    label: 'Funis',
    itens: [
      { key: 'tipo_funil',      label: 'Tipos de Funil' },
      { key: 'status_funil',    label: 'Status do Funil' },
      { key: 'tipo_estrategia', label: 'Tipos de Estratégia' },
    ],
  },
  {
    label: 'Time',
    itens: [
      { key: 'responsavel', label: 'Responsáveis' },
    ],
  },
  {
    label: 'Publicação',
    itens: [
      { key: 'checklist', label: 'Checklist' },
    ],
  },
  {
    label: 'Testes A/B',
    itens: [
      { key: 'metrica_teste',            label: 'Métricas de Vendas' },
      { key: 'metrica_teste_aquisicao',  label: 'Métricas de Aquisição' },
      { key: 'segmento_teste',           label: 'Segmentos' },
      { key: 'angulo_hero',              label: 'Ângulos da Hero' },
      { key: 'elemento_testado',         label: 'Elementos Testados' },
      { key: 'secao_pagina',             label: 'Seções da Página' },
    ],
  },
]

const CHECKLIST_FASES: { key: CategoriaConfig; label: string }[] = [
  { key: 'checklist_setup',           label: 'Setup' },
  { key: 'checklist_desenvolvimento', label: 'Desenvolvimento' },
  { key: 'checklist_testes',          label: 'Testes' },
  { key: 'checklist_performance',     label: 'Performance' },
]

const CORES_RAPIDAS = ['#22c55e','#3b82f6','#f97316','#eab308','#ef4444','#6b7280','#a855f7','#ec4899']

interface Props { configs: Configuracao[]; especialistas: Especialista[] }

// ─── Linha de item reutilizável ────────────────────────────────────────────────

function ItemRow({
  item,
  descricao,
  editando,
  confirmandoDelete,
  podeSubir,
  podeDescer,
  onEditar,
  onSalvar,
  onCancelarEdicao,
  onToggleAtivo,
  onConfirmarDelete,
  onCancelarDelete,
  onDeletar,
  onMover,
  setEditando,
}: {
  item: Configuracao
  descricao?: string
  editando: { id: string; valor: string; cor: string } | null
  confirmandoDelete: string | null
  podeSubir: boolean
  podeDescer: boolean
  onEditar: () => void
  onSalvar: () => void
  onCancelarEdicao: () => void
  onToggleAtivo: () => void
  onConfirmarDelete: () => void
  onCancelarDelete: () => void
  onDeletar: () => void
  onMover: (direcao: 'cima' | 'baixo') => void
  setEditando: (v: { id: string; valor: string; cor: string } | null) => void
}) {
  const isEditando = editando?.id === item.id
  return (
    <tr className="hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3">
        {isEditando ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editando.valor}
              onChange={e => setEditando({ ...editando, valor: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') onSalvar(); if (e.key === 'Escape') onCancelarEdicao() }}
              className="flex-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            />
            <button onClick={onSalvar} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
            <button onClick={onCancelarEdicao} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </div>
        ) : (
          <div>
            <span className={`font-medium ${item.ativo ? 'text-white' : 'text-slate-500 line-through'}`}>
              {item.valor}
            </span>
            {descricao && <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditando ? (
          <div className="flex items-center gap-1">
            {CORES_RAPIDAS.map(c => (
              <button key={c} type="button"
                onClick={() => setEditando({ ...editando, cor: editando.cor === c ? '' : c })}
                className={`w-4 h-4 rounded-full transition-all ${editando.cor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : 'opacity-50 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        ) : item.cor ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
            <span className="text-slate-500 text-xs font-mono">{item.cor}</span>
          </span>
        ) : <span className="text-slate-600">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          item.ativo
            ? 'bg-green-500/10 text-green-400 border-green-500/30'
            : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
        }`}>{item.ativo ? 'Ativo' : 'Inativo'}</span>
      </td>
      <td className="px-4 py-3">
        {confirmandoDelete === item.id ? (
          <div className="flex items-center gap-1 justify-end">
            <span className="text-xs text-slate-400">Deletar?</span>
            <button onClick={onDeletar} className="p-1 text-red-400 hover:text-red-300"><Check size={12} /></button>
            <button onClick={onCancelarDelete} className="p-1 text-slate-500 hover:text-slate-300"><X size={12} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => onMover('cima')}
              disabled={!podeSubir}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Mover pra cima"
            ><ArrowUp size={12} /></button>
            <button
              onClick={() => onMover('baixo')}
              disabled={!podeDescer}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Mover pra baixo"
            ><ArrowDown size={12} /></button>
            <button onClick={onEditar} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded transition-colors"><Pencil size={12} /></button>
            <button onClick={onToggleAtivo} className="p-1.5 text-slate-500 hover:text-yellow-400 hover:bg-slate-900 rounded transition-colors" title={item.ativo ? 'Desativar' : 'Ativar'}>{item.ativo ? <X size={12} /> : <Check size={12} />}</button>
            <button onClick={onConfirmarDelete} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition-colors"><Trash2 size={12} /></button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── Tabela de itens reutilizável ──────────────────────────────────────────────

function TabelaItens({
  itens,
  descricoes,
  editando,
  confirmandoDelete,
  setEditando,
  onSalvarEdicao,
  onToggleAtivo,
  onDeletar,
  onMover,
  setConfirmandoDelete,
}: {
  itens: Configuracao[]
  descricoes?: Record<string, string>
  editando: { id: string; valor: string; cor: string } | null
  confirmandoDelete: string | null
  setEditando: (v: { id: string; valor: string; cor: string } | null) => void
  onSalvarEdicao: () => void
  onToggleAtivo: (item: Configuracao) => void
  onDeletar: (id: string) => void
  onMover: (itens: Configuracao[], index: number, direcao: 'cima' | 'baixo') => void
  setConfirmandoDelete: (id: string | null) => void
}) {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">Valor</th>
            <th className="px-4 py-3 text-left font-medium">Cor</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.07]">
          {itens.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs">
                Nenhum item cadastrado.
              </td>
            </tr>
          ) : itens.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              descricao={descricoes?.[item.valor]}
              editando={editando}
              confirmandoDelete={confirmandoDelete}
              podeSubir={index > 0}
              podeDescer={index < itens.length - 1}
              onEditar={() => setEditando({ id: item.id, valor: item.valor, cor: item.cor ?? '' })}
              onSalvar={onSalvarEdicao}
              onCancelarEdicao={() => setEditando(null)}
              onToggleAtivo={() => onToggleAtivo(item)}
              onConfirmarDelete={() => setConfirmandoDelete(item.id)}
              onCancelarDelete={() => setConfirmandoDelete(null)}
              onDeletar={() => onDeletar(item.id)}
              onMover={direcao => onMover(itens, index, direcao)}
              setEditando={setEditando}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function GerenciarConfiguracoes({ configs, especialistas }: Props) {
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('status_pagina')
  const [novoValor, setNovoValor] = useState('')
  const [novaCor, setNovaCor] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; valor: string; cor: string } | null>(null)
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null)
  const [deletados, setDeletados] = useState<Set<string>>(new Set())

  // Para a aba checklist, estado por fase
  const [checkNovoValor, setCheckNovoValor] = useState<Partial<Record<CategoriaConfig, string>>>({})
  const [checkAdicionando, setCheckAdicionando] = useState<CategoriaConfig | null>(null)

  const itens = configs
    .filter(c => c.categoria === abaAtiva && !deletados.has(c.id))
    .sort((a, b) => a.ordem - b.ordem)

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoValor.trim() || abaAtiva === 'checklist' || abaAtiva === 'especialistas') return
    setAdicionando(true)
    try {
      await criarConfiguracao({ categoria: abaAtiva as CategoriaConfig, valor: novoValor.trim(), cor: novaCor || undefined, ordem: itens.length + 1 })
      setNovoValor('')
      setNovaCor('')
      router.refresh()
    } finally { setAdicionando(false) }
  }

  async function handleAdicionarChecklist(e: React.FormEvent, cat: CategoriaConfig) {
    e.preventDefault()
    const val = checkNovoValor[cat]?.trim()
    if (!val) return
    setCheckAdicionando(cat)
    try {
      const itensCategoria = configs.filter(c => c.categoria === cat && !deletados.has(c.id))
      await criarConfiguracao({ categoria: cat, valor: val, ordem: itensCategoria.length + 1 })
      setCheckNovoValor(v => ({ ...v, [cat]: '' }))
      router.refresh()
    } finally { setCheckAdicionando(null) }
  }

  async function handleSalvarEdicao() {
    if (!editando) return
    await atualizarConfiguracao(editando.id, { valor: editando.valor.trim(), cor: editando.cor || null })
    setEditando(null)
    router.refresh()
  }

  async function handleToggleAtivo(item: Configuracao) {
    await atualizarConfiguracao(item.id, { ativo: !item.ativo })
    router.refresh()
  }

  async function handleDeletar(id: string) {
    setDeletados(d => new Set(d).add(id))
    setConfirmandoDelete(null)
    try {
      await deletarConfiguracao(id)
    } catch {
      setDeletados(d => { const next = new Set(d); next.delete(id); return next })
    }
  }

  async function handleMover(itensOrdenados: Configuracao[], index: number, direcao: 'cima' | 'baixo') {
    const alvo = direcao === 'cima' ? index - 1 : index + 1
    if (alvo < 0 || alvo >= itensOrdenados.length) return
    const atual = itensOrdenados[index]
    const vizinho = itensOrdenados[alvo]
    await Promise.all([
      atualizarConfiguracao(atual.id, { ordem: vizinho.ordem }),
      atualizarConfiguracao(vizinho.id, { ordem: atual.ordem }),
    ])
    router.refresh()
  }

  const abaLabel = GRUPOS.flatMap(g => g.itens).find(i => i.key === abaAtiva)?.label ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie as listas de opções usadas em todo o sistema.</p>
      </div>

      <div className="flex gap-8 items-start">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <nav className="w-44 shrink-0 space-y-5">
          {GRUPOS.map(grupo => (
            <div key={grupo.label}>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1.5 px-2">
                {grupo.label}
              </p>
              <div className="space-y-0.5">
                {grupo.itens.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setAbaAtiva(item.key)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      abaAtiva === item.key
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Conteúdo ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          <h2 className="text-base font-semibold text-white">{abaLabel}</h2>

          {/* Especialistas: componente próprio (tabela FK real, fora de configuracoes) */}
          {abaAtiva === 'especialistas' ? (
            <GerenciarEspecialistas especialistas={especialistas} />
          ) : abaAtiva === 'checklist' ? (
            <div className="space-y-6">
              {CHECKLIST_FASES.map(fase => {
                const itensFase = configs
                  .filter(c => c.categoria === fase.key && !deletados.has(c.id))
                  .sort((a, b) => a.ordem - b.ordem)
                return (
                  <div key={fase.key} className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{fase.label}</h3>
                    <TabelaItens
                      itens={itensFase}
                      editando={editando}
                      confirmandoDelete={confirmandoDelete}
                      setEditando={setEditando}
                      onSalvarEdicao={handleSalvarEdicao}
                      onToggleAtivo={handleToggleAtivo}
                      onDeletar={handleDeletar}
                      onMover={handleMover}
                      setConfirmandoDelete={setConfirmandoDelete}
                    />
                    <form onSubmit={e => handleAdicionarChecklist(e, fase.key)} className="flex gap-2">
                      <input
                        value={checkNovoValor[fase.key] ?? ''}
                        onChange={e => setCheckNovoValor(v => ({ ...v, [fase.key]: e.target.value }))}
                        placeholder={`Novo item de ${fase.label.toLowerCase()}...`}
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={checkAdicionando === fase.key || !checkNovoValor[fase.key]?.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Categorias normais */
            <>
              <form onSubmit={handleAdicionar} className="flex items-center gap-2">
                <input
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                  placeholder="Novo item..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  {CORES_RAPIDAS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setNovaCor(novaCor === c ? '' : c)}
                      className={`w-5 h-5 rounded-full transition-all ${novaCor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={adicionando || !novoValor.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </form>
              <TabelaItens
                itens={itens}
                descricoes={abaAtiva === 'funcao_pagina' ? DESCRICOES_TIPO_PAGINA : undefined}
                editando={editando}
                confirmandoDelete={confirmandoDelete}
                setEditando={setEditando}
                onSalvarEdicao={handleSalvarEdicao}
                onToggleAtivo={handleToggleAtivo}
                onDeletar={handleDeletar}
                onMover={handleMover}
                setConfirmandoDelete={setConfirmandoDelete}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
