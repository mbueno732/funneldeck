export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-gray-900 rounded-lg" />
          <div className="h-4 w-44 bg-gray-900/60 rounded" />
        </div>
        <div className="h-9 w-44 bg-gray-900 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-900 rounded" />
              <div className="h-8 w-8 bg-gray-900 rounded-lg" />
            </div>
            <div className="h-9 w-16 bg-gray-900 rounded" />
            <div className="h-3 w-24 bg-gray-900/60 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-900 rounded" />
              <div className="h-8 w-8 bg-gray-900 rounded-lg" />
            </div>
            <div className="h-9 w-16 bg-gray-900 rounded" />
            <div className="h-3 w-24 bg-gray-900/60 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-gray-900 rounded" />
          <div className="h-6 w-12 bg-gray-900 rounded" />
        </div>
        <div className="h-2.5 bg-gray-900 rounded-full" />
        <div className="flex gap-6">
          {[80, 100, 90, 70].map((w, i) => <div key={i} className="h-3 bg-gray-900 rounded" style={{ width: w }} />)}
        </div>
      </div>
    </div>
  )
}
