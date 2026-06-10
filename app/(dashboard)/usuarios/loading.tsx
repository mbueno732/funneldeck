export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-8 w-32 bg-gray-900 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-900 rounded animate-pulse" />
      </div>
      <div className="h-40 bg-gray-900 border border-white/10 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-900 border border-white/10 rounded-xl animate-pulse" />
    </div>
  )
}
