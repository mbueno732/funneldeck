export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-800 rounded-lg" />
          <div className="h-4 w-32 bg-gray-800/60 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-800 rounded-lg" />
      </div>

      {/* Filtros skeleton */}
      <div className="flex gap-2">
        {[140, 120, 120, 100].map((w, i) => (
          <div key={i} className="h-9 bg-gray-800 rounded-lg" style={{ width: w }} />
        ))}
      </div>

      {/* Conteúdo skeleton */}
      <div className="rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-gray-800/60 h-10" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-gray-700">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-800 rounded w-1/3" />
              <div className="h-3 bg-gray-800/60 rounded w-1/4" />
            </div>
            <div className="h-5 w-20 bg-gray-800 rounded-full" />
            <div className="h-5 w-16 bg-gray-800 rounded-full" />
            <div className="h-5 w-8 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
