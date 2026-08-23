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
    <div style={{ height: "390px" }} className="w-full flex justify-center overflow-hidden">
      <div
        style={{ transform: "scale(1.3)", transformOrigin: "top center" }}
        className="flex justify-center"
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