import { createClient } from '@/lib/supabase/server'
import { listarUsuarios } from '@/lib/actions/usuarios'
import { GerenciarUsuarios } from '@/components/usuarios/GerenciarUsuarios'

export default async function UsuariosPage() {
  let step = 'init'
  try {
    step = 'createClient'
    const supabase = await createClient()

    step = 'getUser'
    const { data: { user } } = await supabase.auth.getUser()

    step = 'listarUsuarios'
    const usuarios = await listarUsuarios()

    step = 'render'
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie quem tem acesso ao Funneldeck.</p>
        </div>
        <GerenciarUsuarios
          usuarios={usuarios}
          usuarioAtualId={user?.id ?? ''}
        />
      </div>
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 space-y-2">
        <p className="font-medium">Erro na etapa: <span className="font-mono">{step}</span></p>
        <p className="text-sm font-mono break-all">{msg}</p>
      </div>
    )
  }
}
