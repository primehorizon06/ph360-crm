"use client";

import { CustomSelect } from "@/components/ui/Select";
import { stateLabel, US_STATES } from "@/utils/constants/usStates";

const OPTIONS = ["", ...US_STATES.map((s) => s.code)];
const LABELS = ["Sin estado", ...US_STATES.map((s) => `${s.name} (${s.code})`)];

interface Props {
  name: string;
  value: string;
  onChange: (code: string) => void;
}

export function StateSelect({ name, value, onChange }: Props) {
  return (
    <CustomSelect
      name={name}
      aria-label="Estado"
      value={value ? (stateLabel(value) ?? `${value} (no válido)`) : "Selecciona un estado"}
      onChange={onChange}
      options={OPTIONS}
      labels={LABELS}
      searchable
    />
  );
}
