"use client";

import { forwardRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale/es";
import { CalendarDays, ChevronDown } from "lucide-react";
import { isWeekend, todayYmd } from "@/lib/businessDays";
import { formatYmd } from "@/utils/helpers/format";
import { inputDateToDate, toInputDate } from "@/utils/helpers/dateInput";

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
}

// El calendario trabaja con fechas locales del navegador; solo importa el día.
const toDate = inputDateToDate;
const toYmd = toInputDate;

const Trigger = forwardRef<HTMLButtonElement, { label: string; onClick?: () => void }>(
  function Trigger({ label, onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-lg text-on-surface whitespace-nowrap hover:border-tertiary/30 transition-colors"
      >
        <CalendarDays size={16} className="text-on-surface-variant" />
        <span>{label}</span>
        <ChevronDown size={14} className="text-on-surface-variant" />
      </button>
    );
  },
);

/** Calendario para filtrar la cola de cobros por fecha. */
export function CollectionDatePicker({ value, onChange, window }: Props) {
  const counts = window ? Object.fromEntries(window.map((d) => [d.date, d.count])) : null;
  const selected = value ?? window?.[0]?.date ?? todayYmd();
  const short = formatYmd(selected, "short");
  const label = selected === todayYmd() ? "Hoy" : short.charAt(0).toUpperCase() + short.slice(1);
  const hasWeekendDate = (window ?? []).some((d) => isWeekend(d.date));

  return (
    <DatePicker
      locale="es"
      selected={toDate(selected)}
      onChange={(date: Date | null) => date && onChange(toYmd(date))}
      calendarStartDay={1}
      calendarClassName={hasWeekendDate ? undefined : "calendar-weekdays"}
      popperPlacement="bottom-start"
      portalId="collection-datepicker-portal"
      popperClassName="z-50!"
      {...(window
        ? { includeDates: window.map((d) => toDate(d.date)) }
        : { maxDate: toDate(todayYmd()) })}
      renderDayContents={(day, date) => {
        const dayCount = counts && date ? counts[toYmd(date)] : undefined;
        return (
          <span
            className="relative inline-block"
            title={dayCount !== undefined ? `${dayCount} cuota${dayCount !== 1 ? "s" : ""}` : undefined}
          >
            {day}
            {dayCount ? (
              <span
                aria-hidden="true"
                className="absolute left-1/2 -bottom-1 h-1 w-1 -translate-x-1/2 rounded-full bg-warning"
              />
            ) : null}
          </span>
        );
      }}
      customInput={<Trigger label={label} />}
    />
  );
}
