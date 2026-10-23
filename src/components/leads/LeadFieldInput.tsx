"use client";

import { Control, Controller, UseFormRegister } from "react-hook-form";
import { LeadFormData } from "@/lib/validations/lead";
import { LEAD_FIELDS } from "@/utils/constants/leads";
import { StateSelect } from "./StateSelect";

interface Props {
  field: (typeof LEAD_FIELDS)[number];
  register: UseFormRegister<LeadFormData>;
  control: Control<LeadFormData>;
  idPrefix: string;
}

export function LeadFieldInput({ field, register, control, idPrefix }: Props) {
  if (field.type === "select") {
    return (
      <Controller
        name="state"
        control={control}
        render={({ field: { value, onChange } }) => (
          <StateSelect name={`${idPrefix}-state`} value={value ?? ""} onChange={onChange} />
        )}
      />
    );
  }

  return (
    <input
      type={field.type}
      {...register(field.name as keyof LeadFormData)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50"
    />
  );
}
