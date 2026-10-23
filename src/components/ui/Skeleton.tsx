export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`motion-safe:animate-pulse rounded bg-surface-container-high ${className}`}
    />
  );
}

function SkeletonStatus({
  label = "Cargando...",
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function ListSkeleton({
  rows = 3,
  rowClassName = "h-20",
}: {
  rows?: number;
  rowClassName?: string;
}) {
  return (
    <SkeletonStatus className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`rounded-xl ${rowClassName}`} />
      ))}
    </SkeletonStatus>
  );
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonStatus className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 sm:w-48 rounded-lg" />
      </div>
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
        <Skeleton className="h-5 w-full" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </SkeletonStatus>
  );
}

export function DetailSkeleton() {
  return (
    <SkeletonStatus className="space-y-6">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg hidden sm:block" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-lg shrink-0" />
        ))}
      </div>
      <div className="bg-surface-container border border-outline-variant rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}
