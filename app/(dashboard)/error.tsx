'use client'

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 space-y-2">
      <p className="font-medium">Erro ao renderizar a página</p>
      <p className="text-sm font-mono">{error.message}</p>
      {error.digest && <p className="text-xs text-red-500/60">digest: {error.digest}</p>}
    </div>
  )
}
