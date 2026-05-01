import { fmt } from "@/utils/helpers/format";

export function AvailableBadge({
  available,
  total,
}: {
  available: number;
  total: number;
}) {
  const isComplete = Math.abs(available) < 0.01;
  const isOver = available < 0;


  return (
    <p
      className={`text-xs mt-1 font-medium ${
        isComplete
          ? "text-emerald-500"
          : isOver
            ? "text-red-400"
            : "text-amber-400"
      }`}
    >
      {isComplete
        ? "✓ Distribuido completamente"
        : isOver
          ? `⚠ Excede en ${fmt(Math.abs(available))}`
          : `Disponible: ${fmt(available)} de ${fmt(total)}`}
    </p>
  );
}
