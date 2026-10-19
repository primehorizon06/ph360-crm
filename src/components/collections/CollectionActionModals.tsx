"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, ModalFooter, modalInputClass } from "@/components/ui/Modal";
import { postAction } from "@/lib/postAction";
import {
  rescheduleFormSchema,
  RescheduleFormData,
  suspendSchema,
  SuspendFormData,
} from "@/lib/validations/installment";
import { fromInputDate } from "@/utils/helpers/dateInput";
import { isWeekend, todayYmd } from "@/lib/businessDays";
import { formatAmount, formatDate, formatYmd } from "@/utils/helpers/format";

export interface ActionTarget {
  id: number;
  number: number;
  date: string;
  amount: number;
  /** Se omite cuando el modal se abre desde el cliente mismo. */
  customerName?: string;
  /** Ej: "Cuenta ···· 1234 · Chase" */
  accountLabel?: string;
  /** Día hábil (YYYY-MM-DD) en que SOAR procesaría el débito. */
  chargeDate?: string;
}

interface Props {
  target: ActionTarget;
  onClose: () => void;
  onDone: () => void;
}

// Encabezado común: a quién y qué cuota afecta la acción.
function ActionModal({
  title,
  target,
  onClose,
  children,
}: {
  title: string;
  target: ActionTarget;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-on-surface-variant text-lg">
        {target.customerName && `${target.customerName} · `}pago {target.number} · {formatDate(target.date)} · ${" "}
        {formatAmount(target.amount)}
      </p>
      {children}
    </Modal>
  );
}

// La cuota ya fue confirmada (autorización del cliente), así que cobrar solo
// pide revisar el resumen.
export function ChargeModal({ target, onClose, onDone }: Props) {
  const [saving, setSaving] = useState(false);
  const chargeDate = target.chargeDate ?? todayYmd();
  const scheduled = chargeDate > todayYmd();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const success = scheduled
      ? `Débito programado para el ${formatYmd(chargeDate)}`
      : "Débito enviado a SOAR";
    const ok = await postAction(`/api/installments/${target.id}/charge`, undefined, { success });
    setSaving(false);
    if (ok) onDone();
  }

  return (
    <ActionModal
      title={scheduled ? "Programar cobro" : "Cobrar pago"}
      target={target}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-lg text-white/90">
          Se creará un débito ACH por{" "}
          <strong className="text-white">$ {formatAmount(target.amount)}</strong>
          {target.accountLabel && <> a la {target.accountLabel}</>}
          {scheduled ? (
            <>
              , que SOAR procesará el <strong className="text-white">{formatYmd(chargeDate)}</strong>.
            </>
          ) : (
            <>, con fecha de hoy.</>
          )}
        </p>
        <ModalFooter onClose={onClose} saving={saving} label={scheduled ? "Programar" : "Cobrar"} />
      </form>
    </ActionModal>
  );
}

export function SuspendModal({ target, onClose, onDone }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SuspendFormData>({ resolver: zodResolver(suspendSchema) });

  return (
    <ActionModal title="Suspender pago" target={target} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async ({ reason }) => {
          if (await postAction(`/api/installments/${target.id}/suspend`, { reason }, { success: "Pago suspendido" }))
            onDone();
        })}
        className="space-y-3"
      >
        <div className="space-y-1">
          <label className="text-lg text-on-surface-variant">Motivo</label>
          <textarea
            {...register("reason")}
            rows={3}
            placeholder="Ej: no contesta, pidió que lo llamen el viernes..."
            className={`${modalInputClass} resize-none`}
          />
          {errors.reason && <p className="text-error text-sm">{errors.reason.message}</p>}
        </div>
        <ModalFooter onClose={onClose} saving={isSubmitting} label="Suspender" />
      </form>
    </ActionModal>
  );
}

export function RescheduleModal({ target, onClose, onDone }: Props) {
  const today = todayYmd();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RescheduleFormData>({
    resolver: zodResolver(rescheduleFormSchema),
    defaultValues: { date: today },
  });

  return (
    <ActionModal title="Reprogramar pago" target={target} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async ({ date }) => {
          if (date < today) {
            setError("date", { message: "La nueva fecha no puede ser anterior a hoy" });
            return;
          }
          if (isWeekend(date)) {
            setError("date", { message: "Las cuotas no pueden caer en sábado ni domingo" });
            return;
          }
          if (
            await postAction(
              `/api/installments/${target.id}/reschedule`,
              { date: fromInputDate(date) },
              { success: "Pago reprogramado" },
            )
          )
            onDone();
        })}
        className="space-y-3"
      >
        <div className="space-y-1">
          <label className="text-lg text-on-surface-variant">Nueva fecha de cobro</label>
          <input {...register("date")} type="date" min={today} className={modalInputClass} />
          {errors.date && <p className="text-error text-sm">{errors.date.message}</p>}
        </div>
        <ModalFooter onClose={onClose} saving={isSubmitting} label="Reprogramar" />
      </form>
    </ActionModal>
  );
}
