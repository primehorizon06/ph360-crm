"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Avatar } from "@/components/ui/Avatar";
import { quincenaLabel } from "@/components/dashboard/paymentGroups";

interface FranchiseSales {
  id: number;
  name: string;
  logo: string | null;
  sales: number;
}

interface Props {
  year: number;
  month: number;
  quincena: 1 | 2;
  /** Franquicia elegida en el dashboard. */
  companyId?: string;
}

// Rango de ventas (tokens de globals.css): se ve en un círculo junto al nombre
// y en el punto de la onda. Clases completas para que Tailwind las genere.
const TIERS = [
  { max: 10, label: "0–10", dot: "bg-sales-red" },
  { max: 20, label: "11–20", dot: "bg-sales-orange" },
  { max: 30, label: "21–30", dot: "bg-sales-yellow" },
  { max: 40, label: "31–40", dot: "bg-sales-aqua" },
  { max: Infinity, label: "Más de 40", dot: "bg-sales-green" },
];

const tierFor = (sales: number) => TIERS.find((t) => sales <= t.max)!;

/** Alto de cada fila (px): la onda pasa por el centro de cada una. */
const ROW = 48;

/** Eje de 0 a 50 de 5 en 5; si alguna franquicia supera 50, se amplía de 10 en 10. */
function axisFor(max: number) {
  const top = Math.max(50, Math.ceil(max / 10) * 10);
  const step = top <= 50 ? 5 : 10;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

/**
 * Curva suave (Catmull-Rom convertida a Bézier) que pasa por los puntos, en
 * coordenadas del viewBox: x de 0 a 100 (porcentaje del eje) e y en px.
 */
function wavePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Ventas (productos aprobados) por franquicia en la quincena elegida en el
 * dashboard, como onda: una fila por franquicia con su logo y un círculo del
 * color de su rango; la curva pasa por las ventas de cada una.
 */
export function SalesByFranchiseChart({ year, month, quincena, companyId }: Props) {
  const { data = [], isLoading } = useSWR<FranchiseSales[]>(
    `/api/dashboard/sales?year=${year}&month=${month}&quincena=${quincena}` +
      (companyId ? `&companyId=${companyId}` : ""),
    fetcher,
    { keepPreviousData: true },
  );

  const { top, ticks } = axisFor(Math.max(0, ...data.map((f) => f.sales)));
  const x = (value: number) => (value / top) * 100;
  const height = data.length * ROW;
  const points = data.map((f, i) => ({ x: x(f.sales), y: i * ROW + ROW / 2 }));
  const line = wavePath(points);
  // Relleno: del eje (x = 0) hasta la curva. Con una sola franquicia no hay
  // curva: solo queda su punto.
  const curve = line.includes("C") ? line.slice(line.indexOf("C")) : "";
  const area = curve
    ? `M 0 ${points[0].y} L ${points[0].x} ${points[0].y} ${curve} L 0 ${points[points.length - 1].y} Z`
    : "";

  return (
    <section className="bg-surface border border-white/10 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-on-surface">Ventas por franquicia</h2>
        <p className="text-sm text-on-surface-variant">
          Productos aprobados · {quincenaLabel(year, month, quincena)}
        </p>
      </div>

      {data.length === 0 && !isLoading ? (
        <p className="text-center py-8 text-on-surface-variant">No hay franquicias activas</p>
      ) : (
        <div className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-x-4">
          {/* Franquicias: logo, nombre y círculo del rango */}
          <div>
            {data.map((franchise) => {
              const tier = tierFor(franchise.sales);
              return (
                <div key={franchise.id} className="flex items-center gap-2 min-w-0" style={{ height: ROW }}>
                  <Avatar name={franchise.name} avatar={franchise.logo} size="sm" />
                  <span className="text-lg text-on-surface truncate" title={franchise.name}>
                    {franchise.name}
                  </span>
                  <span
                    aria-label={`Rango ${tier.label}`}
                    className={`h-2.5 w-2.5 shrink-0 rounded-full opacity-80 ${tier.dot}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Onda */}
          <div className="relative mr-10" style={{ height }}>
            {ticks.map((t) => (
              <span
                key={t}
                aria-hidden
                className="absolute inset-y-0 w-px bg-white/5"
                style={{ left: `${x(t)}%` }}
              />
            ))}
            <svg
              aria-hidden
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox={`0 0 100 ${height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="salesWave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-on-surface)" stopOpacity={0} />
                  <stop offset="100%" stopColor="var(--color-on-surface)" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#salesWave)" />
              <path
                d={line}
                fill="none"
                stroke="var(--color-on-surface)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Puntos (HTML para que no se deformen con el SVG) y número de ventas */}
            {data.map((franchise, i) => {
              const tier = tierFor(franchise.sales);
              return (
                <div
                  key={franchise.id}
                  className="absolute flex items-center -translate-y-1/2"
                  style={{ left: `${points[i].x}%`, top: points[i].y }}
                  title={`${franchise.name}: ${franchise.sales} venta${franchise.sales !== 1 ? "s" : ""}`}
                >
                  <span className={`h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-surface ${tier.dot}`} />
                  <span className="ml-1.5 text-sm font-semibold text-on-surface tabular-nums">
                    {franchise.sales}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Eje */}
          <div />
          <div className="relative h-6 border-t border-white/20 mr-10">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-1 -translate-x-1/2 text-xs text-on-surface-variant tabular-nums"
                style={{ left: `${x(t)}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda de rangos */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <span className="text-sm text-on-surface-variant">Rango de ventas:</span>
        {TIERS.map((t) => (
          <span key={t.label} className="inline-flex items-center gap-1.5 text-sm text-on-surface">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full opacity-80 ${t.dot}`} />
            {t.label}
          </span>
        ))}
      </div>
    </section>
  );
}
