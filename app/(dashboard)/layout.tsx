import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user ?? null
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar usuario={{ nome: usuario?.nome ?? user?.email ?? '', perfil: usuario?.perfil ?? 'visualizador' }} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
