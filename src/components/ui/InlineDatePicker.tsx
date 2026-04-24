"use client";

import { es } from "date-fns/locale/es";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Props {
  onChange: (date: Date | null) => void;
  highlightDates?: Date[];
}

registerLocale("es", es);

export function InlineDatePicker({ onChange, highlightDates = [] }: Props) {
  return (
    // Wrapper que reserva el espacio real y oculta el overflow del scale
    <div style={{ height: "310px" }} className="w-full flex justify-center overflow-hidden">
      <div
        style={{ transform: "scale(1.3)", transformOrigin: "top center" }}
        className={[
          "flex justify-center",
          "[&_.react-datepicker]:bg-[#0d0f14]",
          "[&_.react-datepicker]:border-white/10",
          "[&_.react-datepicker]:rounded-xl",
          "[&_.react-datepicker]:font-sans",
          "[&_.react-datepicker__header]:bg-[#13151c]",
          "[&_.react-datepicker__header]:border-white/10",
          "[&_.react-datepicker__current-month]:text-white/70",
          "[&_.react-datepicker__day-name]:text-white/50",
          "[&_.react-datepicker__day]:text-white/60",
          "[&_.react-datepicker__day:hover]:bg-cyan-500/20",
          "[&_.react-datepicker__day:hover]:text-cyan-400",
          "[&_.react-datepicker__day:hover]:rounded-full",
          "[&_.react-datepicker__day--highlighted]:bg-cyan-500/20",
          "[&_.react-datepicker__day--highlighted]:text-cyan-400",
          "[&_.react-datepicker__day--highlighted]:rounded-full",
          "[&_.react-datepicker__day--keyboard-selected]:bg-transparent",
          "[&_.react-datepicker__day--today]:text-white",
          "[&_.react-datepicker__day--today]:font-semibold",
          "[&_.react-datepicker__navigation-icon]:before:border-white/40",
          "[&_.react-datepicker__day--outside-month]:text-white/15",
        ].join(" ")}
      >
        <DatePicker
          inline
          onChange={onChange}
          highlightDates={highlightDates}
          calendarStartDay={1}
          locale="es"
          minDate={new Date()}
          filterDate={(date) => date.getDay() !== 0}
          monthsShown={2}
        />
      </div>
    </div>
  );
}