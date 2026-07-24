export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-slate-900 rounded-lg" />
          <div className="h-4 w-28 bg-slate-900/60 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-900 rounded-lg" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {[180, 140, 120, 120, 110, 110].map((w, i) => (
          <div key={i} className="h-9 bg-slate-900 rounded-lg" style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900/60 h-10" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-slate-800">
            <div className="flex-1 h-4 bg-slate-900 rounded w-1/4" />
            <div className="h-4 bg-slate-900 rounded w-24" />
            <div className="h-4 bg-slate-900 rounded w-16" />
            <div className="h-5 w-20 bg-slate-900 rounded-full" />
            <div className="h-5 w-20 bg-slate-900 rounded-full" />
            <div className="h-4 bg-slate-900 rounded w-12" />
            <div className="h-4 bg-slate-900 rounded w-16" />
            <div className="h-6 w-16 bg-slate-900 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
