export default function Loading() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 bg-gray-900 rounded-lg" />
        <div className="h-4 w-64 bg-gray-900/60 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-gray-900 rounded-lg" />
        <div className="h-10 w-28 bg-gray-900 rounded-lg" />
      </div>
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="bg-gray-900/60 h-10" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <div className="h-4 w-40 bg-gray-900 rounded" />
            <div className="h-5 w-14 bg-gray-900 rounded-full" />
            <div className="flex gap-1">
              <div className="h-7 w-7 bg-gray-900 rounded" />
              <div className="h-7 w-7 bg-gray-900 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
