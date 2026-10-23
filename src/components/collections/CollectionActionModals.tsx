"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, ModalFooter, modalInputClass } from "@/components/ui/Modal";
import { WeekdayDateField } from "@/components/ui/WeekdayDateField";
import { postAction } from "@/lib/postAction";
import {
  cancelSchema,
  CancelFormData,
  rescheduleFormSchema,
  RescheduleFormData,
  suspendSchema,
  SuspendFormData,
} from "@/lib/validations/installment";
import { fromInputDate } from "@/utils/helpers/dateInput";
import { isWeekend, nextBusinessDay, todayYmd } from "@/lib/businessDays";
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
  /** Tiene un débito en curso en SOAR (cancelar lo anula primero). */
  processing?: boolean;
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

// Baja definitiva: el pago no se cobra más y sale de Caída. No se puede deshacer.
export function CancelModal({ target, onClose, onDone }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CancelFormData>({ resolver: zodResolver(cancelSchema) });

  return (
    <ActionModal title="Cancelar pago" target={target} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async ({ reason }) => {
          if (await postAction(`/api/installments/${target.id}/cancel`, { reason }, { success: "Pago cancelado" }))
            onDone();
        })}
        className="space-y-3"
      >
        <p className="text-lg text-on-surface">
          El pago se dará de baja y no se volverá a cobrar.
          {target.processing && " Primero se anulará en SOAR el débito que está en curso."} Esta acción
          no se puede deshacer.
        </p>
        <div className="space-y-1">
          <label className="text-lg text-on-surface-variant">Motivo</label>
          <textarea
            {...register("reason")}
            rows={3}
            placeholder="Ej: acuerdo de pago con el cliente, pago duplicado..."
            className={`${modalInputClass} resize-none`}
          />
          {errors.reason && <p className="text-error text-sm">{errors.reason.message}</p>}
        </div>
        <ModalFooter onClose={onClose} saving={isSubmitting} label="Cancelar pago" closeLabel="Volver" />
      </form>
    </ActionModal>
  );
}

export function RescheduleModal({ target, onClose, onDone }: Props) {
  const today = todayYmd();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RescheduleFormData>({
    resolver: zodResolver(rescheduleFormSchema),
    defaultValues: { date: isWeekend(today) ? nextBusinessDay(today) : today },
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
          <label htmlFor="rescheduleDate" className="text-lg text-on-surface-variant">
            Nueva fecha de cobro
          </label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <WeekdayDateField
                id="rescheduleDate"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                minDate={today}
              />
            )}
          />
          {errors.date && <p className="text-error text-sm">{errors.date.message}</p>}
        </div>
        <ModalFooter onClose={onClose} saving={isSubmitting} label="Reprogramar" />
      </form>
    </ActionModal>
  );
}
