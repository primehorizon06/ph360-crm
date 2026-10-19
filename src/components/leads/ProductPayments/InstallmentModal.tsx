"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarClock, PauseCircle } from "lucide-react";
import { Modal, ModalFooter, modalInputClass } from "@/components/ui/Modal";
import {
  installmentFormSchema,
  InstallmentFormData,
  isEditableInstallmentStatus,
} from "@/lib/validations/installment";
import { postAction } from "@/lib/postAction";
import { fromInputDate, toInputDate } from "@/utils/helpers/dateInput";
import { formatDate } from "@/utils/helpers/format";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_STYLES,
} from "@/utils/constants/installments";

export interface EditableInstallment {
  id: number;
  number: number;
  date: string;
  amount: number;
  status: string;
  confirmedAt?: string | null;
  confirmedBy?: { name: string } | null;
}

interface Props {
  leadId: string | number;
  productId: number;
  /** Sin pago: modo "agregar". */
  installment?: EditableInstallment;
  /** Puede cambiar fecha y monto (gestiona pagos). */
  canEditPlan: boolean;
  /** Puede marcar la confirmación del pago. */
  canConfirm: boolean;
  /** Acciones del plan de pagos; se muestran solo si se pasan. */
  onSuspend?: () => void;
  onReschedule?: () => void;
  onClose: () => void;
  onSaved: () => void;
}

const actionButton =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-on-surface-variant transition-colors";

export function InstallmentModal({
  leadId,
  productId,
  installment,
  canEditPlan,
  canConfirm,
  onSuspend,
  onReschedule,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!installment;
  const fieldsEditable = canEditPlan && (!installment || isEditableInstallmentStatus(installment.status));
  const initialDate = installment ? toInputDate(installment.date) : "";
  const initialAmount = installment ? String(Number(installment.amount)) : "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentFormSchema),
    defaultValues: {
      date: initialDate,
      amount: initialAmount,
      confirmed: !!installment?.confirmedAt,
    },
  });

  async function onSubmit(data: InstallmentFormData) {
    if (!installment) {
      const ok = await postAction(
        `/api/leads/${leadId}/products/${productId}/installments`,
        { date: fromInputDate(data.date), amount: Number(data.amount) },
        { success: "Pago agregado", error: "No se pudo agregar el pago" },
      );
      if (ok) onSaved();
      return;
    }

    // El monto se compara como número: "100.00" es el mismo monto que "100".
    const dateChanged = fieldsEditable && data.date !== initialDate;
    const amountChanged = fieldsEditable && Number(data.amount) !== Number(installment.amount);
    const fieldsChanged = dateChanged || amountChanged;
    let changed = false;

    if (fieldsChanged) {
      const ok = await postAction(
        `/api/installments/${installment.id}`,
        {
          ...(dateChanged ? { date: fromInputDate(data.date) } : {}),
          ...(amountChanged ? { amount: Number(data.amount) } : {}),
        },
        { method: "PATCH", error: "No se pudo guardar el pago" },
      );
      if (!ok) return;
      changed = true;
    }

    // Cambiar fecha o monto reinicia la confirmación en el servidor; si sigue
    // marcada, se vuelve a confirmar para los datos nuevos.
    const confirmedNow = fieldsChanged ? false : !!installment.confirmedAt;
    if (canConfirm && data.confirmed !== confirmedNow) {
      const ok = await postAction(
        `/api/installments/${installment.id}/confirm`,
        { confirmed: data.confirmed },
        { error: "No se pudo guardar la confirmación del pago" },
      );
      if (!ok) return onSaved();
      changed = true;
    }

    if (!changed) {
      toast.info("No hay cambios para guardar");
      return;
    }
    toast.success("Pago actualizado");
    onSaved();
  }

  const status = installment?.status;
  const hasActions = !!onSuspend || !!onReschedule;
  const canSave = !isEdit || fieldsEditable || canConfirm;

  return (
    <Modal title={isEdit ? `Editar pago ${installment.number}` : "Agregar pago"} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {status && (
          <div className="flex items-center justify-between">
            <span className="text-lg text-on-surface-variant">Estado</span>
            <span
              className={`text-sm px-2 py-0.5 rounded-full font-medium ${INSTALLMENT_STATUS_STYLES[status] ?? ""}`}
              title="Lo actualizan las acciones del plan de pagos y SOAR"
            >
              {INSTALLMENT_STATUS_LABELS[status] ?? status}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-lg text-on-surface-variant">Fecha</label>
          <input
            {...register("date")}
            type="date"
            disabled={!fieldsEditable}
            className={`${modalInputClass} disabled:opacity-60`}
          />
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
            disabled={!fieldsEditable}
            className={`${modalInputClass} disabled:opacity-60`}
          />
          {errors.amount && <p className="text-error text-sm">{errors.amount.message}</p>}
        </div>

        {isEdit && canConfirm && (
          <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register("confirmed")}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 accent-action"
            />
            <span className="space-y-0.5">
              <span className="block text-lg text-white/90">Pago confirmado</span>
              <span className="block text-sm text-on-surface-variant">
                El cliente autorizó el débito de esta fecha y este monto. Solo los pagos
                confirmados pasan a Cobros.
              </span>
              {installment.confirmedAt && (
                <span className="block text-sm text-success">
                  Confirmado el {formatDate(installment.confirmedAt)}
                  {installment.confirmedBy && ` por ${installment.confirmedBy.name}`}
                </span>
              )}
            </span>
          </label>
        )}

        {isEdit && !canConfirm && installment.confirmedAt && (
          <p className="text-sm text-success">
            Pago confirmado el {formatDate(installment.confirmedAt)}
            {installment.confirmedBy && ` por ${installment.confirmedBy.name}`}
          </p>
        )}

        {hasActions && (
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
            {onSuspend && (
              <button
                type="button"
                onClick={onSuspend}
                className={`${actionButton} hover:text-attention hover:border-attention/30`}
              >
                <PauseCircle size={14} />
                Suspender
              </button>
            )}
            {onReschedule && (
              <button
                type="button"
                onClick={onReschedule}
                className={`${actionButton} hover:text-tertiary hover:border-tertiary/30`}
              >
                <CalendarClock size={14} />
                Reprogramar
              </button>
            )}
          </div>
        )}

        {canSave ? (
          <ModalFooter onClose={onClose} saving={isSubmitting} />
        ) : (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-lg text-white/90 hover:text-white transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
