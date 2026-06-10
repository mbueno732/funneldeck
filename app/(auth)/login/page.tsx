'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl border border-gray-700 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366f1" />
              <path d="M8 10h16l-5.5 7v5l-5-2.2V17L8 10z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 22, letterSpacing: '-0.3px', lineHeight: 1 }}>
              <span className="font-semibold text-white">Funnel</span>
              <span className="font-semibold" style={{ color: '#a5b4fc' }}>deck</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm">Hub operacional de funis & CRO</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-400">Senha</label>
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

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
