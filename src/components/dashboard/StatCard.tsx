// src/components/dashboard/StatCard.tsx
"use client";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  variant?: "default" | "accent" | "danger" | "warning";
  icon?: React.ReactNode;
  sublabel?: string;
}

const variantStyles = {
  default: "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700",
  accent: "bg-cyan-500 border-cyan-400",
  danger: "bg-red-500 border-red-400",
  warning: "bg-amber-500 border-amber-400",
};

const labelStyles = {
  default: "text-zinc-400",
  accent: "text-cyan-100",
  danger: "text-red-100",
  warning: "text-amber-100",
};

const valueStyles = {
  default: "text-zinc-800 dark:text-zinc-100",
  accent: "text-white",
  danger: "text-white",
  warning: "text-white",
};

export function StatCard({
  label,
  value,
  delta,
  up,
  variant = "default",
  icon,
  sublabel,
}: StatCardProps) {
  const isColored = variant !== "default";

  return (
    <div
      className={`rounded-xl p-4 border flex flex-col gap-1 ${variantStyles[variant]}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-md font-medium uppercase tracking-wider ${labelStyles[variant]}`}
        >
          {label}
        </span>
        {icon && (
          <span className={isColored ? "text-white/70" : "text-zinc-400"}>
            {icon}
          </span>
        )}
      </div>

      <span className={`text-2xl font-bold mt-1 ${valueStyles[variant]}`}>
        {value}
      </span>

      {sublabel && (
        <span
          className={`text-md ${isColored ? "text-white/70" : "text-zinc-400"}`}
        >
          {sublabel}
        </span>
      )}

      {delta !== undefined && (
        <span
          className={`text-md font-medium mt-0.5 ${
            isColored
              ? "text-white/80"
              : up
                ? "text-emerald-500"
                : "text-red-400"
          }`}
        >
          {delta} vs quincena ant.
        </span>
      )}
    </div>
  );
}
