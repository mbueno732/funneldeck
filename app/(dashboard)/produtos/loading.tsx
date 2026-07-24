export default function Loading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-28 bg-slate-900 rounded-lg" />
        <div className="h-4 w-56 bg-slate-900/60 rounded" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="h-10 w-40 bg-slate-900 rounded-lg" />
        <div className="h-10 flex-1 bg-slate-900 rounded-lg" />
        <div className="h-10 w-28 bg-slate-900 rounded-lg" />
      </div>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900/60 h-10" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-slate-800">
            <div className="h-4 flex-1 bg-slate-900 rounded" />
            <div className="h-4 w-32 bg-slate-900 rounded" />
            <div className="h-5 w-14 bg-slate-900 rounded-full" />
            <div className="flex gap-1">
              <div className="h-7 w-7 bg-slate-900 rounded" />
              <div className="h-7 w-7 bg-slate-900 rounded" />
              <div className="h-7 w-7 bg-slate-900 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
