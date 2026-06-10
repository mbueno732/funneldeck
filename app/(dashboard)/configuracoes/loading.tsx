export default function Loading() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 bg-gray-800 rounded-lg" />
        <div className="h-4 w-72 bg-gray-800/60 rounded" />
      </div>
      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {[100, 80, 100, 90, 110, 110].map((w, i) => (
          <div key={i} className="h-9 bg-gray-800 rounded-t-lg" style={{ width: w }} />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-gray-800 rounded-lg" />
        <div className="flex gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-5 w-5 bg-gray-800 rounded-full" />
          ))}
        </div>
        <div className="h-10 w-28 bg-gray-800 rounded-lg" />
      </div>
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="bg-gray-800/60 h-10" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-gray-800">
            <div className="h-4 w-32 bg-gray-800 rounded" />
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 bg-gray-800 rounded-full" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
            <div className="h-5 w-14 bg-gray-800 rounded-full" />
            <div className="flex gap-1 ml-auto">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-7 w-7 bg-gray-800 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
