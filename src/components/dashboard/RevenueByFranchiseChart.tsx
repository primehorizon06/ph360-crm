"use client";

import { Avatar } from "@/components/ui/Avatar";
import { fmt } from "@/utils/helpers/format";

interface Props {
  data: { companyId: number; name: string; logo: string | null; recaudo: number }[];
  /** El dashboard está filtrado por una franquicia: el ranking no aplica. */
  companyFiltered: boolean;
}

/** Eje de 0 a 10.000 de 1.000 en 1.000; si una franquicia supera 10.000, se amplía. */
function axisFor(max: number) {
  const step = max <= 10000 ? 1000 : Math.ceil(max / 10 / 1000) * 1000;
  const top = Math.max(10000, Math.ceil(max / step) * step);
  return { top, ticks: Array.from({ length: top / step }, (_, i) => (i + 1) * step) };
}

const thousands = (v: number) => v.toLocaleString("es-CO");

/**
 * Ranking quincenal de recaudo (pagos cobrados) por franquicia: una fila por
 * franquicia con su logo, y una línea que termina en un punto en su recaudo.
 */
export function RevenueByFranchiseChart({ data, companyFiltered }: Props) {
  const { top, ticks } = axisFor(Math.max(0, ...data.map((f) => f.recaudo)));
  const pct = (value: number) => `${(value / top) * 100}%`;

  return (
    <section className="bg-surface border border-white/10 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-on-surface">Ranking quincenal por franquicia</h2>
        <p className="text-sm text-on-surface-variant">Recaudo de pagos cobrados</p>
      </div>

      {data.length === 0 ? (
        <p className="text-md text-on-surface-variant text-center py-8">
          {companyFiltered ? "Selecciona 'Todas' para ver el ranking" : "Sin recaudo en este período"}
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-x-4">
          {data.map((franchise) => (
            <div key={franchise.companyId} className="contents">
              <div className="flex items-center gap-2 py-2 min-w-0">
                <Avatar name={franchise.name} avatar={franchise.logo} size="sm" />
                <span className="text-lg text-on-surface truncate" title={franchise.name}>
                  {franchise.name}
                </span>
              </div>
              <div
                className="relative flex items-center py-2 pr-24"
                title={`${franchise.name}: ${fmt(franchise.recaudo)}`}
              >
                {/* Línea y punto final en el recaudo; las guías comparten la escala del eje */}
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
                    className="h-0.5 rounded-full bg-on-surface/70"
                    style={{ width: pct(franchise.recaudo) }}
                  />
                  <span
                    aria-hidden
                    className="absolute h-3 w-3 -translate-x-1/2 rounded-full bg-on-surface ring-2 ring-surface"
                    style={{ left: pct(franchise.recaudo) }}
                  />
                  <span
                    className="absolute ml-3 text-sm font-semibold text-on-surface tabular-nums whitespace-nowrap"
                    style={{ left: pct(franchise.recaudo) }}
                  >
                    {fmt(franchise.recaudo)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Eje: 1.000 a 10.000 */}
          <div />
          <div className="relative h-6 border-t border-white/20 mr-24">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-1 -translate-x-1/2 text-xs text-on-surface-variant tabular-nums"
                style={{ left: pct(t) }}
              >
                {thousands(t)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
