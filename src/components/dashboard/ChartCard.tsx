"use client";

import { Skeleton } from "@/components/ui/Skeleton";

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
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-2 w-20" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
      <Skeleton className="h-3 w-32 mb-4" />
      <Skeleton className="h-40" />
    </div>
  );
}
