"use client";

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale/es";
import { modalInputClass } from "@/components/ui/Modal";
import { inputDateToDate, toInputDate } from "@/utils/helpers/dateInput";

registerLocale("es", es);

interface Props {
  value: string;
  onChange: (ymd: string) => void;
  onBlur?: () => void;
  minDate?: string;
  disabled?: boolean;
  id?: string;
}

export function WeekdayDateField({ value, onChange, onBlur, minDate, disabled, id }: Props) {
  return (
    <DatePicker
      id={id}
      locale="es"
      selected={value ? inputDateToDate(value) : null}
      onChange={(date: Date | null) => onChange(date ? toInputDate(date) : "")}
      onBlur={onBlur}
      minDate={minDate ? inputDateToDate(minDate) : undefined}
      filterDate={(date) => date.getDay() !== 0 && date.getDay() !== 6}
      calendarStartDay={1}
      calendarClassName="calendar-weekdays"
      dateFormat="dd/MM/yyyy"
      placeholderText="dd/mm/aaaa"
      disabled={disabled}
      popperPlacement="bottom-start"
      portalId="weekday-datepicker-portal"
      popperClassName="z-[60]!"
      wrapperClassName="w-full"
      className={`${modalInputClass} disabled:opacity-60`}
    />
  );
}
