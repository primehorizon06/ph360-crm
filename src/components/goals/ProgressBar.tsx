export function ProgressBar({
  value,
  max,
  color = "bg-cyan-500",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: pct + "%" }}
      />
    </div>
  );
}