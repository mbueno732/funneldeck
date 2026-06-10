import { createClient } from '@/lib/supabase/server'
import { listarUsuarios } from '@/lib/actions/usuarios'
import { GerenciarUsuarios } from '@/components/usuarios/GerenciarUsuarios'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let usuarios: Awaited<ReturnType<typeof listarUsuarios>> = []
  let erroAdmin = false

  try {
    usuarios = await listarUsuarios()
  } catch (e) {
    console.error('[Usuarios] Erro ao listar:', e)
    erroAdmin = true
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie quem tem acesso ao Funneldeck.</p>
      </div>
      {erroAdmin && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          Erro ao carregar usuários. Verifique se a variável <code className="font-mono bg-red-500/10 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> está configurada na Vercel e faça um novo deploy.
        </div>
      )}
      <GerenciarUsuarios
        usuarios={usuarios}
        usuarioAtualId={user?.id ?? ''}
      />
    </div>
  )
}
