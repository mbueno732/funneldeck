'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Shield, Eye, Loader2, Mail, RotateCcw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { convidarUsuario, atualizarPerfilUsuario, reenviarConvite } from '@/lib/actions/usuarios'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: 'editor' | 'visualizador'
  criado_em: string
  nunca_entrou: boolean
}

interface Props {
  usuarios: Usuario[]
  usuarioAtualId: string
}

export function GerenciarUsuarios({ usuarios, usuarioAtualId }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [alterandoPerfil, setAlterandoPerfil] = useState<string | null>(null)
  const [reenviando, setReenviando] = useState<string | null>(null)
  const [sucessoReenvio, setSucessoReenvio] = useState<string | null>(null)

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setEnviando(true)
    const result = await convidarUsuario(email.trim().toLowerCase())
    if (result.error) {
      setErro(result.error)
    } else {
      setSucesso(`Convite enviado para ${email}`)
      setEmail('')
      router.refresh()
    }
    setEnviando(false)
  }

  async function handleReenviar(emailAlvo: string) {
    setReenviando(emailAlvo)
    setSucessoReenvio(null)
    const result = await reenviarConvite(emailAlvo)
    if (!result.error) {
      setSucessoReenvio(emailAlvo)
      setTimeout(() => setSucessoReenvio(null), 3000)
    }
    setReenviando(null)
  }

  async function handleAlterarPerfil(id: string, perfil: 'editor' | 'visualizador') {
    setAlterandoPerfil(id)
    const result = await atualizarPerfilUsuario(id, perfil)
    if (!result.error) router.refresh()
    setAlterandoPerfil(null)
  }

  function iniciais(nome: string) {
    return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div className="space-y-6">

      {/* Convidar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-white font-medium">Convidar usuário</h2>
          <p className="text-slate-500 text-sm mt-0.5">A pessoa receberá um email para criar a própria senha.</p>
        </div>
        <form onSubmit={handleConvidar} className="flex gap-2">
          <div className="relative flex-1">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              required
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={enviando || !email}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {enviando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Convidar
          </button>
        </form>
        {sucesso && <p className="text-green-400 text-sm">{sucesso}</p>}
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
      </div>

      {/* Lista */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <p className="text-sm font-medium text-white">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="divide-y divide-white/[0.07]">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-indigo-400">{iniciais(u.nome || u.email)}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{u.nome || '—'}</p>
                    {u.id === usuarioAtualId && (
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">você</span>
                    )}
                    {u.nunca_entrou && (
                      <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">convite pendente</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {u.nunca_entrou && u.id !== usuarioAtualId && (
                  <button
                    onClick={() => handleReenviar(u.email)}
                    disabled={reenviando === u.email}
                    className="flex items-center gap-1 text-xs px-2 py-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-lg transition-colors"
                    title="Reenviar convite"
                  >
                    {reenviando === u.email
                      ? <Loader2 size={11} className="animate-spin" />
                      : <RotateCcw size={11} />
                    }
                    {sucessoReenvio === u.email ? 'Enviado!' : 'Reenviar'}
                  </button>
                )}
                {alterandoPerfil === u.id ? (
                  <Loader2 size={14} className="text-slate-500 animate-spin" />
                ) : u.id === usuarioAtualId ? (
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${
                    u.perfil === 'editor'
                      ? 'bg-indigo-500/10 text-indigo-400'
                      : 'bg-slate-900 text-slate-400'
                  }`}>
                    {u.perfil === 'editor' ? <Shield size={11} /> : <Eye size={11} />}
                    {u.perfil}
                  </span>
                ) : (
                  <Select value={u.perfil} onValueChange={v => handleAlterarPerfil(u.id, v as 'editor' | 'visualizador')}>
                    <SelectTrigger className="border-0 bg-transparent p-0 h-auto w-auto text-xs font-medium focus:ring-0 focus:ring-offset-0 gap-0 [&>svg]:hidden px-2 py-1 border border-slate-800 rounded-lg text-slate-300 cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="editor" className="text-slate-300 focus:bg-slate-800 focus:text-white">editor</SelectItem>
                      <SelectItem value="visualizador" className="text-slate-300 focus:bg-slate-800 focus:text-white">visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
