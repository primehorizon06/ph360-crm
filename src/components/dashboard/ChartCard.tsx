"use client";

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 ${className}`}
    >
      <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
        {title}
      </p>
      {subtitle && <p className="text-md text-zinc-400 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 animate-pulse">
      <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
      <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
      <div className="h-2 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 animate-pulse">
      <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
      <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded" />
    </div>
  );
}
