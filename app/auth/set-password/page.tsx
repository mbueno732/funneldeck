'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha !== confirmacao) { setErro('As senhas não coincidem.'); return }
    if (senha.length < 6) { setErro('Mínimo 6 caracteres.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) { setErro(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl border border-gray-700 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366f1" />
              <path d="M8 10h16l-5.5 7v5l-5-2.2V17L8 10z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 16, letterSpacing: '-0.3px' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>Funnel</span>
              <span style={{ fontWeight: 600, color: '#a5b4fc' }}>deck</span>
            </span>
          </div>
          <h1 className="text-white font-semibold text-lg">Criar sua senha</h1>
          <p className="text-gray-500 text-sm">Defina uma senha para acessar o Funneldeck.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-400">Nova senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-400">Confirmar senha</label>
            <input
              type="password"
              value={confirmacao}
              onChange={e => setConfirmacao(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Salvando...' : 'Definir senha e entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
