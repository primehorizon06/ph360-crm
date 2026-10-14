"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Modal, ModalFooter, modalInputClass } from "@/components/ui/Modal";
import { CustomSelect } from "@/components/ui/Select";
import {
  installmentFormSchema,
  InstallmentFormData,
  MANUAL_INSTALLMENT_STATUSES,
  ManualInstallmentStatus,
} from "@/lib/validations/installment";
import { fromInputDate, toInputDate } from "@/utils/helpers/dateInput";

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
    <Modal title={isEdit ? `Editar cuota ${installment.number}` : "Agregar cuota"} onClose={onClose}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <label className="text-lg text-on-surface-variant">Fecha</label>
            <input {...register("date")} type="date" className={modalInputClass} />
            {errors.date && <p className="text-error text-sm">{errors.date.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-lg text-on-surface-variant">Monto</label>
            <input
              {...register("amount")}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={modalInputClass}
            />
            {errors.amount && <p className="text-error text-sm">{errors.amount.message}</p>}
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

          <ModalFooter onClose={onClose} saving={isSubmitting} />
        </form>
    </Modal>
  );
}
