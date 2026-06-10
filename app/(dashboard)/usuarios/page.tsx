import { createClient } from '@/lib/supabase/server'
import { listarUsuarios } from '@/lib/actions/usuarios'
import { GerenciarUsuarios } from '@/components/usuarios/GerenciarUsuarios'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const usuarios = await listarUsuarios()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie quem tem acesso ao Funneldeck.</p>
      </div>
      <GerenciarUsuarios
        usuarios={usuarios ?? []}
        usuarioAtualId={user?.id ?? ''}
      />
    </div>
  )
}
