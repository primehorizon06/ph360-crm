"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays, Trash2 } from "lucide-react";
import {
  InstallmentForm,
  installmentSchema,
} from "@/lib/validations/paymentPlanPicker";
import { Installment, Props } from "@/utils/interfaces/paymentPlanPicker";
import { formatDate, formatTotalAmount } from "@/utils/helpers/format";
import { InlineDatePicker } from "@/components/ui/InlineDatePicker";

export function PaymentPlanPicker({ value, onChange, error }: Props) {
  const {
    register,
    control,
    // watch,
    formState: { errors },
  } = useForm<InstallmentForm>({
    resolver: zodResolver(installmentSchema),
    values: { installments: value },
  });

  const { remove } = useFieldArray({ control, name: "installments" });

  // const watched = watch("installments");

  function handleDateClick(date: Date | null) {
    if (!date) return;

    const exists = value.findIndex(
      (i) => i.date.toDateString() === date.toDateString(),
    );

    let updated: Installment[];

    if (exists !== -1) {
      updated = value.filter((_, idx) => idx !== exists);
    } else {
      updated = [...value, { number: 0, date, amount: "" }];
    }

    updated = updated
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((i, idx) => ({ ...i, number: idx + 1 }));

    onChange(updated);
  }

  function handleAmountChange(idx: number, raw: string) {
    const cleaned = raw.replace(/[^\d.,]/g, "");
    const updated = value.map((i, n) =>
      n === idx ? { ...i, amount: cleaned } : i,
    );
    onChange(updated);
  }

  function handleRemove(idx: number) {
    remove(idx);
    const updated = value
      .filter((_, n) => n !== idx)
      .map((i, n) => ({ ...i, number: n + 1 }));
    onChange(updated);
  }

  const highlightedDates = value.map((i) => i.date);
  const hasAmounts = value.some((i) => i.amount !== "");

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-lg text-white/40">
        <CalendarDays size={11} />
        Plan de pagos — selecciona las fechas de cada cuota
      </label>

      {/* Datepicker inline */}
      <InlineDatePicker
        onChange={handleDateClick}
        highlightDates={highlightedDates}
        size="lg"
      />

      {/* Installment list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((installment, idx) => (
            <div
              key={installment.date.toDateString()}
              className="flex items-center gap-3 bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2"
            >
              {/* Número de cuota */}
              <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-lg font-semibold">
                {installment.number}
              </span>

              {/* Fecha */}
              <span className="text-white/50 text-lg w-28 shrink-0">
                {formatDate(installment.date)}
              </span>

              {/* Monto */}
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 text-lg">
                  $
                </span>
                <input
                  {...register(`installments.${idx}.amount`)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={installment.amount}
                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                  className={`w-full bg-[#13151c] border rounded-md pl-6 pr-2 py-1.5 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all ${
                    errors.installments?.[idx]?.amount
                      ? "border-red-500/50"
                      : "border-white/10"
                  }`}
                />
                {errors.installments?.[idx]?.amount && (
                  <p className="text-red-400 text-[10px] mt-0.5">
                    {errors.installments[idx]?.amount?.message}
                  </p>
                )}
              </div>

              {/* Eliminar */}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="shrink-0 text-white/20 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {/* Total */}
          {hasAmounts && (
            <div className="flex items-center justify-between px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <span className="text-lg text-white/40">
                Total · {value.length} cuota{value.length !== 1 ? "s" : ""}
              </span>
              <span className="text-lg font-semibold text-cyan-400">
                $ {formatTotalAmount(value)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error desde el padre (validación al submit) */}
      {error && <p className="text-red-400 text-lg">{error}</p>}

      {value.length === 0 && (
        <p className="text-center text-white/20 text-lg py-2">
          Haz clic en el calendario para agregar cuotas
        </p>
      )}
    </div>
  );
}
