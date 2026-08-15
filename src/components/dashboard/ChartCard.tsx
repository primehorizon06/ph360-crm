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
      className={`bg-surface-container border border-outline-variant rounded-xl p-4 ${className}`}
    >
      <p className="text-lg font-semibold text-on-surface">
        {title}
      </p>
      {subtitle && <p className="text-md text-on-surface-variant mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 animate-pulse">
      <div className="h-3 w-24 bg-surface-container-high rounded mb-3" />
      <div className="h-8 w-32 bg-surface-container-high rounded mb-2" />
      <div className="h-2 w-20 bg-surface-container-high rounded" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 animate-pulse">
      <div className="h-3 w-32 bg-surface-container-high rounded mb-4" />
      <div className="h-40 bg-surface-container-high rounded" />
    </div>
  );
}
