'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, GitBranch,
  FileText, Settings, LogOut, UserCog, FlaskConical, Sparkles,
} from 'lucide-react'
import { Logo } from './Logo'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard',        label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/produtos',         label: 'Produtos',           icon: Package },
  { href: '/funis',            label: 'Funis',              icon: GitBranch },
  { href: '/paginas',          label: 'Páginas',            icon: FileText },
  { href: '/variantes',        label: 'Experimentos',       icon: FlaskConical },
  { href: '/padroes-sucesso',  label: 'Padrões de Sucesso', icon: Sparkles },
  { href: '/usuarios',         label: 'Usuários',           icon: UserCog },
  { href: '/configuracoes',    label: 'Configurações',      icon: Settings },
]

interface Props {
  usuario: { nome: string; perfil: string }
}

export function Sidebar({ usuario }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col">
      <div className="px-4 py-4 border-b border-slate-800">
        <Logo />
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Usuário + logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{usuario.nome}</p>
            <p className="text-xs text-slate-500 capitalize">{usuario.perfil}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
