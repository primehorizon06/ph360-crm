import { z } from "zod";

// Estados que se pueden asignar a mano. PAID y FAILED los determina el
// procesador de pagos, y una cuota en esos estados ya no se edita.
export const MANUAL_INSTALLMENT_STATUSES = ["PENDING", "SUSPENDED", "CANCELLED"] as const;
export type ManualInstallmentStatus = (typeof MANUAL_INSTALLMENT_STATUSES)[number];

export function isManualInstallmentStatus(status: string): status is ManualInstallmentStatus {
  return (MANUAL_INSTALLMENT_STATUSES as readonly string[]).includes(status);
}

const MAX_AMOUNT = 99_999_999.99;

// Formulario (cliente): los inputs entregan strings.
export const installmentFormSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine((v) => Number(v) > 0 && Number(v) <= MAX_AMOUNT, "El monto debe ser mayor a 0"),
  status: z.enum(MANUAL_INSTALLMENT_STATUSES),
});

export type InstallmentFormData = z.infer<typeof installmentFormSchema>;

// API (servidor)
const dateField = z.coerce.date({ error: "Fecha inválida" });
const amountField = z.coerce
  .number({ error: "Monto inválido" })
  .positive("El monto debe ser mayor a 0")
  .max(MAX_AMOUNT, "Monto inválido");

export const installmentCreateSchema = z.object({
  date: dateField,
  amount: amountField,
});

// Cola de cobros: suspender (sin autorización del cliente) y reprogramar.
const suspendReasonField = z
  .string()
  .trim()
  .min(3, "Escribe el motivo de la suspensión")
  .max(500, "Máximo 500 caracteres");

export const suspendSchema = z.object({ reason: suspendReasonField });
export type SuspendFormData = z.infer<typeof suspendSchema>;

export const rescheduleFormSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
});
export type RescheduleFormData = z.infer<typeof rescheduleFormSchema>;
export const rescheduleSchema = z.object({ date: dateField });

// Cobro ACH con SEC TEL: cada débito necesita la autorización del cliente por
// teléfono para ese monto y esa fecha.
export const chargeSchema = z.object({
  authorized: z.boolean().refine((v) => v, "Confirma que el cliente autorizó el débito"),
});
export type ChargeFormData = z.infer<typeof chargeSchema>;

export const installmentUpdateSchema = z
  .object({
    date: dateField.optional(),
    amount: amountField.optional(),
    status: z.enum(MANUAL_INSTALLMENT_STATUSES, { error: "Estado inválido" }).optional(),
  })
  .refine((d) => d.date || d.amount || d.status, "No hay cambios para guardar");
