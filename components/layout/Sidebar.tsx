'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, GitBranch,
  FileText, Settings, LogOut, UserCog, FlaskConical,
} from 'lucide-react'
import { Logo } from './Logo'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/produtos',       label: 'Produtos',      icon: Package },
  { href: '/funis',          label: 'Funis',         icon: GitBranch },
  { href: '/paginas',        label: 'Páginas',       icon: FileText },
  { href: '/variantes',      label: 'Experimentos',  icon: FlaskConical },
  { href: '/usuarios',       label: 'Usuários',      icon: UserCog },
  { href: '/configuracoes',  label: 'Configurações', icon: Settings },
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
    <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-800">
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
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Usuário + logout */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{usuario.nome}</p>
            <p className="text-xs text-gray-500 capitalize">{usuario.perfil}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded-lg transition-colors shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
