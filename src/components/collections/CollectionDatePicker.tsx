"use client";

import { forwardRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale/es";
import { CalendarDays, ChevronDown } from "lucide-react";
import { todayYmd } from "@/lib/businessDays";
import { formatYmd } from "@/utils/helpers/format";

registerLocale("es", es);

interface Props {
  value: string | null;
  onChange: (ymd: string) => void;
  /**
   * Fechas permitidas (YYYY-MM-DD) con su cantidad de cuotas: la ventana de
   * cobro, que calcula el backend. Sin `window`, se puede elegir cualquier
   * fecha hasta hoy (fechas de pago).
   */
  window?: { date: string; count: number }[];
  /** Cantidad a mostrar junto a la fecha elegida (modo sin ventana). */
  count?: number;
}

// El calendario trabaja con fechas locales del navegador; solo importa el día.
function toDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const Trigger = forwardRef<HTMLButtonElement, { label: string; count?: number; onClick?: () => void }>(
  function Trigger({ label, count, onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-lg text-white/90 hover:border-tertiary/30 transition-colors"
      >
        <CalendarDays size={16} className="text-on-surface-variant" />
        <span>{label}</span>
        {count !== undefined && (
          <span className="text-sm px-2 py-0.5 rounded-full bg-warning/10 text-warning">{count}</span>
        )}
        <ChevronDown size={14} className="text-on-surface-variant" />
      </button>
    );
  },
);

/** Calendario para filtrar la cola de cobros por fecha. */
export function CollectionDatePicker({ value, onChange, window, count }: Props) {
  const counts = window ? Object.fromEntries(window.map((d) => [d.date, d.count])) : null;
  const selected = value ?? window?.[0]?.date ?? todayYmd();
  const short = formatYmd(selected, "short");
  const label = selected === todayYmd() ? "Hoy" : short.charAt(0).toUpperCase() + short.slice(1);

  return (
    <DatePicker
      locale="es"
      selected={toDate(selected)}
      onChange={(date: Date | null) => date && onChange(toYmd(date))}
      calendarStartDay={1}
      {...(window
        ? { includeDates: window.map((d) => toDate(d.date)) }
        : { maxDate: toDate(todayYmd()) })}
      renderDayContents={(day, date) => {
        const dayCount = counts && date ? counts[toYmd(date)] : undefined;
        return (
          <span title={dayCount !== undefined ? `${dayCount} cuota${dayCount !== 1 ? "s" : ""}` : undefined}>
            {day}
            {dayCount ? <sup className="ml-0.5 text-[10px] text-warning">{dayCount}</sup> : null}
          </span>
        );
      }}
      customInput={<Trigger label={label} count={counts ? (counts[selected] ?? 0) : count} />}
    />
  );
}
