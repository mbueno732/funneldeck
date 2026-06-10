export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 bg-gray-800 rounded-lg" />
          <div className="h-4 w-16 bg-gray-800/60 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-800 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-44 bg-gray-800 rounded-lg" />
        <div className="h-9 w-36 bg-gray-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800/60 rounded w-1/2" />
              </div>
              <div className="h-5 w-16 bg-gray-800 rounded-full" />
            </div>
            <div className="h-5 w-20 bg-gray-800 rounded-full" />
            <div className="flex items-center gap-2">
              <div className="h-2 bg-gray-800 rounded-full flex-1" />
              <div className="h-3 w-8 bg-gray-800 rounded" />
            </div>
            <div className="flex gap-2 pt-1 border-t border-gray-800">
              <div className="h-7 flex-1 bg-gray-800 rounded-lg" />
              <div className="h-7 w-16 bg-gray-800 rounded-lg" />
              <div className="h-7 w-14 bg-gray-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
