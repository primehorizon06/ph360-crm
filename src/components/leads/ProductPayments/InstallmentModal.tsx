"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { CustomSelect } from "@/components/ui/Select";
import {
  installmentFormSchema,
  InstallmentFormData,
  MANUAL_INSTALLMENT_STATUSES,
  ManualInstallmentStatus,
} from "@/lib/validations/installment";

const STATUS_LABELS: Record<ManualInstallmentStatus, string> = {
  PENDING: "Pendiente",
  SUSPENDED: "Suspendida",
  CANCELLED: "Cancelada",
};

interface Props {
  leadId: string | number;
  productId: number;
  /** Sin cuota: modo "agregar". */
  installment?: { id: number; number: number; date: string; amount: number; status: ManualInstallmentStatus };
  onClose: () => void;
  onSaved: () => void;
}

// Las fechas del plan se guardan como medianoche local (igual que el selector
// del plan de pagos), así que se convierten en hora local, no en UTC.
function toInputDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromInputDate(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

const inputClass =
  "w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all";

export function InstallmentModal({ leadId, productId, installment, onClose, onSaved }: Props) {
  const isEdit = !!installment;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentFormSchema),
    defaultValues: {
      date: installment ? toInputDate(installment.date) : "",
      amount: installment ? String(Number(installment.amount)) : "",
      status: installment?.status ?? "PENDING",
    },
  });

  async function onSubmit(data: InstallmentFormData) {
    const payload = {
      date: fromInputDate(data.date),
      amount: Number(data.amount),
      ...(isEdit ? { status: data.status } : {}),
    };

    const res = await fetch(
      isEdit
        ? `/api/installments/${installment.id}`
        : `/api/leads/${leadId}/products/${productId}/installments`,
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Error al guardar la cuota");
      return;
    }

    toast.success(isEdit ? "Cuota actualizada" : "Cuota agregada");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white/80 font-medium">
            {isEdit ? `Editar cuota ${installment.number}` : "Agregar cuota"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/20 hover:text-white/90 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <label className="text-lg text-on-surface-variant">Fecha</label>
            <input {...register("date")} type="date" className={inputClass} />
            {errors.date && <p className="text-red-400 text-sm">{errors.date.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-lg text-on-surface-variant">Monto</label>
            <input
              {...register("amount")}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={inputClass}
            />
            {errors.amount && <p className="text-red-400 text-sm">{errors.amount.message}</p>}
          </div>

          {isEdit && (
            <div className="space-y-1">
              <label className="text-lg text-on-surface-variant">Estado</label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <CustomSelect
                    name="status"
                    value={STATUS_LABELS[field.value]}
                    onChange={field.onChange}
                    options={[...MANUAL_INSTALLMENT_STATUSES]}
                    labels={MANUAL_INSTALLMENT_STATUSES.map((s) => STATUS_LABELS[s])}
                  />
                )}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-lg text-white/90 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
