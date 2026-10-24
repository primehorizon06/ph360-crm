"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import "react-datepicker/dist/react-datepicker.css";
import { AlertTriangle, CalendarDays, CheckCircle2, Trash2 } from "lucide-react";
import {
  InstallmentForm,
  installmentSchema,
} from "@/lib/validations/paymentPlanPicker";
import { Installment, Props } from "@/utils/interfaces/paymentPlanPicker";
import {
  formatAmount,
  formatDate,
  formatTotalAmount,
  installmentsTotal,
} from "@/utils/helpers/format";
import { toCents } from "@/lib/validations/productCatalog";
import { InlineDatePicker } from "@/components/ui/InlineDatePicker";

export function PaymentPlanPicker({ value, onChange, error, targetAmount, children }: Props) {
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
  const differenceCents =
    targetAmount == null ? null : toCents(targetAmount) - toCents(installmentsTotal(value));
  const matchesTarget = differenceCents === 0;

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-lg text-on-surface-variant">
        <CalendarDays size={11} />
        Plan de pagos — selecciona las fechas de cada cuota
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-center">
        {/* Datepicker inline */}
        <InlineDatePicker
          onChange={handleDateClick}
          highlightDates={highlightedDates}
        />

        <div className="space-y-3">
          {/* Installment list */}
          {value.length > 0 && (
            <div className="space-y-2">
              {value.map((installment, idx) => (
                <div
                  key={installment.date.toDateString()}
                  className="flex items-center gap-3 bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2"
                >
                  {/* Número de cuota */}
                  <span className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-lg font-semibold">
                    {installment.number}
                  </span>

                  {/* Fecha */}
                  <span className="text-white/90 text-lg shrink-0 whitespace-nowrap">
                    {formatDate(installment.date)}
                  </span>

                  {/* Monto */}
                  <div className="flex-1 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/90 text-lg">
                      $
                    </span>
                    <input
                      {...register(`installments.${idx}.amount`)}
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-label={`Monto de la cuota ${installment.number}`}
                      aria-invalid={!!errors.installments?.[idx]?.amount || undefined}
                      aria-describedby={
                        errors.installments?.[idx]?.amount ? `installment-${idx}-error` : undefined
                      }
                      value={installment.amount}
                      onChange={(e) => handleAmountChange(idx, e.target.value)}
                      className={`w-full bg-surface border rounded-md pl-6 pr-2 py-1.5 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all ${
                        errors.installments?.[idx]?.amount
                          ? "border-red-500/50"
                          : "border-white/10"
                      }`}
                    />
                    {errors.installments?.[idx]?.amount && (
                      <p id={`installment-${idx}-error`} className="text-red-400 text-sm mt-0.5">
                        {errors.installments[idx]?.amount?.message}
                      </p>
                    )}
                  </div>

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    aria-label={`Eliminar la cuota ${installment.number}`}
                    className="shrink-0 -m-2 p-3.5 rounded-lg text-white/40 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-tertiary/40 outline-none transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Total */}
              {(hasAmounts || differenceCents !== null) && (
                <div
                  className={`px-3 py-2 rounded-lg border space-y-0.5 ${
                    matchesTarget
                      ? "bg-success/5 border-success/30"
                      : differenceCents !== null && error
                        ? "bg-warning/10 border-warning/30"
                        : "bg-tertiary/5 border-tertiary/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg text-on-surface-variant">
                      Total · {value.length} cuota{value.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-lg font-semibold text-cyan-400">
                      $ {formatTotalAmount(value)}
                    </span>
                  </div>
                  {differenceCents !== null && targetAmount != null && (
                    <p
                      aria-live="polite"
                      className={`flex items-center gap-1.5 text-sm ${
                        matchesTarget
                          ? "text-success"
                          : error
                            ? "text-warning"
                            : "text-on-surface-variant"
                      }`}
                    >
                      {matchesTarget ? (
                        <CheckCircle2 size={14} aria-hidden="true" className="shrink-0" />
                      ) : error ? (
                        <AlertTriangle size={14} aria-hidden="true" className="shrink-0" />
                      ) : null}
                      {matchesTarget
                        ? `Cuadra con el precio de $ ${formatAmount(targetAmount)}`
                        : differenceCents > 0
                          ? `Faltan $ ${formatAmount(differenceCents / 100)} para llegar a $ ${formatAmount(targetAmount)}`
                          : `Sobran $ ${formatAmount(-differenceCents / 100)} sobre $ ${formatAmount(targetAmount)}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error desde el padre (validación al submit) */}
          {error && (
            <p role="alert" className="text-red-400 text-lg">
              {error}
            </p>
          )}

          {value.length === 0 && (
            <p className="text-center text-white/20 text-lg py-2">
              Haz clic en el calendario para agregar cuotas
            </p>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
