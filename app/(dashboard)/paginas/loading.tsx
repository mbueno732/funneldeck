export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-gray-800 rounded-lg" />
          <div className="h-4 w-28 bg-gray-800/60 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-800 rounded-lg" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {[180, 140, 120, 120, 110, 110].map((w, i) => (
          <div key={i} className="h-9 bg-gray-800 rounded-lg" style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-xl border border-gray-600 overflow-hidden">
        <div className="bg-gray-800/60 h-10" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-gray-600">
            <div className="flex-1 h-4 bg-gray-800 rounded w-1/4" />
            <div className="h-4 bg-gray-800 rounded w-24" />
            <div className="h-4 bg-gray-800 rounded w-16" />
            <div className="h-5 w-20 bg-gray-800 rounded-full" />
            <div className="h-5 w-20 bg-gray-800 rounded-full" />
            <div className="h-4 bg-gray-800 rounded w-12" />
            <div className="h-4 bg-gray-800 rounded w-16" />
            <div className="h-6 w-16 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
