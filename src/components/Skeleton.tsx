export function SongSkeleton() {
  return (
    <div className="flex items-center gap-3.5 p-2.5 rounded-xl animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-surface-800 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 bg-surface-800 rounded w-3/4" />
        <div className="h-2.5 bg-surface-800/60 rounded w-1/2" />
      </div>
      <div className="h-3 w-8 bg-surface-800 rounded" />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="aspect-square rounded-2xl bg-surface-800 animate-pulse" />
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: count }).map((_, i) => <SongSkeleton key={i} />)}
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-surface-900/60 border border-surface-800/50 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded bg-surface-800" />
        <div className="h-3 bg-surface-800 rounded w-20" />
      </div>
      <div className="h-7 bg-surface-800 rounded w-16" />
    </div>
  )
}
