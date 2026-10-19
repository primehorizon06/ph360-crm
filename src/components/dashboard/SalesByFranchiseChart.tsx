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

// Rango de ventas (tokens de globals.css): se ve en un círculo junto al nombre.
// Clases completas para que Tailwind las genere.
const TIERS = [
  { max: 10, label: "0–10", dot: "bg-sales-red" },
  { max: 20, label: "11–20", dot: "bg-sales-orange" },
  { max: 30, label: "21–30", dot: "bg-sales-yellow" },
  { max: 40, label: "31–40", dot: "bg-sales-aqua" },
  { max: Infinity, label: "Más de 40", dot: "bg-sales-green" },
];

const tierFor = (sales: number) => TIERS.find((t) => sales <= t.max)!;

/** Eje de 0 a 50 de 5 en 5; si alguna franquicia supera 50, se amplía de 10 en 10. */
function axisFor(max: number) {
  const top = Math.max(50, Math.ceil(max / 10) * 10);
  const step = top <= 50 ? 5 : 10;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

/**
 * Ventas (productos aprobados) por franquicia en la quincena elegida en el
 * dashboard. Las franquicias son categorías, así que van en barras
 * horizontales ordenadas de mayor a menor (no en una línea, que sugeriría una
 * continuidad entre ellas). El círculo junto al nombre indica el rango.
 */
export function SalesByFranchiseChart({ year, month, quincena, companyId }: Props) {
  const { data = [], isLoading } = useSWR<FranchiseSales[]>(
    `/api/dashboard/sales?year=${year}&month=${month}&quincena=${quincena}` +
      (companyId ? `&companyId=${companyId}` : ""),
    fetcher,
    { keepPreviousData: true },
  );

  // De mayor a menor; los empates conservan el orden de creación de la API.
  const rows = [...data].sort((a, b) => b.sales - a.sales);
  const { top, ticks } = axisFor(Math.max(0, ...rows.map((f) => f.sales)));
  const pct = (value: number) => `${(value / top) * 100}%`;

  return (
    <section className="bg-surface border border-white/10 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-on-surface">Ventas por franquicia</h2>
        <p className="text-sm text-on-surface-variant">
          Productos aprobados · {quincenaLabel(year, month, quincena)}
        </p>
      </div>

      {rows.length === 0 && !isLoading ? (
        <p className="text-center py-8 text-on-surface-variant">No hay franquicias activas</p>
      ) : (
        <div className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-x-4">
          {rows.map((franchise) => {
            const tier = tierFor(franchise.sales);
            return (
              <div key={franchise.id} className="contents">
                {/* Franquicia: logo, nombre y círculo del rango */}
                <div className="flex items-center gap-2 py-2 min-w-0">
                  <Avatar name={franchise.name} avatar={franchise.logo} size="sm" />
                  <span className="text-lg text-on-surface truncate" title={franchise.name}>
                    {franchise.name}
                  </span>
                  <span
                    aria-label={`Rango ${tier.label}`}
                    className={`h-2.5 w-2.5 shrink-0 rounded-full opacity-80 ${tier.dot}`}
                  />
                </div>

                {/* Barra y número de ventas; las guías comparten la escala del eje */}
                <div
                  className="relative flex items-center py-2 mr-10"
                  title={`${franchise.name}: ${franchise.sales} venta${franchise.sales !== 1 ? "s" : ""}`}
                >
                  <div className="relative w-full h-3 flex items-center">
                    {ticks.map((t) => (
                      <span
                        key={t}
                        aria-hidden
                        className="absolute -inset-y-3 w-px bg-white/5"
                        style={{ left: pct(t) }}
                      />
                    ))}
                    <span
                      aria-hidden
                      className="h-3 rounded-r-sm bg-on-surface/60"
                      style={{ width: pct(franchise.sales) }}
                    />
                    <span
                      className="absolute ml-2 text-sm font-semibold text-on-surface tabular-nums"
                      style={{ left: pct(franchise.sales) }}
                    >
                      {franchise.sales}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Eje */}
          <div />
          <div className="relative h-6 border-t border-white/20 mr-10">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-1 -translate-x-1/2 text-xs text-on-surface-variant tabular-nums"
                style={{ left: pct(t) }}
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
