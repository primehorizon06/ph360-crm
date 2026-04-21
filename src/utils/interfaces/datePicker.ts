import { DatePickerProps } from "react-datepicker";

export interface DatePickerPropsCustom extends Omit<
  DatePickerProps,
  "onChange" | "value"
> {
  label?: string;
  value?: Date | null;
  onChange: (
    date: Date | null,
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => void;
  error?: string;
}
