"use client";

import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, ModalFooter, modalInputClass } from "@/components/ui/Modal";
import { postAction } from "@/lib/postAction";
import {
  chargeSchema,
  ChargeFormData,
  rescheduleFormSchema,
  RescheduleFormData,
  suspendSchema,
  SuspendFormData,
} from "@/lib/validations/installment";
import { fromInputDate } from "@/utils/helpers/dateInput";
import { todayInputValue } from "@/lib/collections";
import { formatAmount, formatDate } from "@/utils/helpers/format";

export interface ActionTarget {
  id: number;
  number: number;
  date: string;
  amount: number;
  customerName: string;
  /** Ej: "Cuenta ···· 1234 · Chase" */
  accountLabel?: string;
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
        {target.customerName} · cuota {target.number} · {formatDate(target.date)} ·  
        {formatAmount(target.amount)}
      </p>
      {children}
    </Modal>
  );
}

export function ChargeModal({ target, onClose, onDone }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChargeFormData>({
    resolver: zodResolver(chargeSchema),
    defaultValues: { authorized: false },
  });

  return (
    <ActionModal title="Cobrar cuota" target={target} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (data) => {
          if (await postAction(`/api/installments/${target.id}/charge`, data, { success: "Débito enviado a SOAR" }))
            onDone();
        })}
        className="space-y-3"
      >
        <p className="text-lg text-white/90">
          Se creará un débito ACH por{" "}
          <strong className="text-white">$ {formatAmount(target.amount)}</strong>
          {target.accountLabel && <> a la {target.accountLabel}</>}, con fecha de hoy.
        </p>
        <label className="flex items-start gap-2 text-lg text-white/80">
          <input
            type="checkbox"
            {...register("authorized")}
            className="mt-1.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-action"
          />
          El cliente autorizó por teléfono este débito, por este monto y con fecha de hoy, y la
          llamada quedó grabada.
        </label>
        {errors.authorized && <p className="text-error text-sm">{errors.authorized.message}</p>}
        <ModalFooter onClose={onClose} saving={isSubmitting} label="Cobrar" />
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
    <ActionModal title="Suspender cuota" target={target} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async ({ reason }) => {
          if (await postAction(`/api/installments/${target.id}/suspend`, { reason }, { success: "Cuota suspendida" }))
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
  const today = todayInputValue();
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
    <ActionModal title="Reprogramar cuota" target={target} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async ({ date }) => {
          if (date < today) {
            setError("date", { message: "La nueva fecha no puede ser anterior a hoy" });
            return;
          }
          if (
            await postAction(
              `/api/installments/${target.id}/reschedule`,
              { date: fromInputDate(date) },
              { success: "Cuota reprogramada" },
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
