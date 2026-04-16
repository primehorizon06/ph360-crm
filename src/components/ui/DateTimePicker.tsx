import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale/es";
registerLocale("es", es);

interface DateTimePickerProps {
  label?: string;
  value?: Date | null;
  onChange: (
    date: Date | null,
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => void;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  id: string;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  placeholder = "Selecciona fecha y hora",
  required,
  minDate,
  maxDate,
  id,
}: DateTimePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <DatePicker
        id={id}
        locale="es"
        selected={value}
        onChange={onChange}
        showTimeSelect
        timeFormat="hh:mm aa"
        timeIntervals={1}
        dateFormat="dd/MM/yyyy hh:mm aa"
        placeholderText={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 flex items-center justify-between"
        required={required}
        minDate={minDate}
        maxDate={maxDate}
        timeCaption="Hora"
      />
    </div>
  );
}
