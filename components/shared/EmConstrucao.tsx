import type { LucideIcon } from 'lucide-react'

interface Props {
  titulo: string
  subtitulo: string
  icon: LucideIcon
  itens: string[]
}

export function EmConstrucao({ titulo, subtitulo, icon: Icon, itens }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{titulo}</h1>
        <p className="text-slate-500 text-sm mt-1">{subtitulo}</p>
      </div>

      <div className="bg-slate-900 border border-dashed border-slate-800 rounded-xl p-14 flex flex-col items-center justify-center text-center gap-4 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
          <Icon size={22} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">Em construção</h3>
          <p className="text-sm text-slate-500">Esta tela ainda não tem funcionalidade — o que vem por aqui:</p>
        </div>
        <ul className="text-left space-y-2 w-full max-w-md">
          {itens.map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-indigo-400 mt-0.5">›</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
