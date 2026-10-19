import { z } from "zod";

// Estados en los que se pueden editar la fecha y el monto de un pago. El
// estado nunca se cambia a mano: lo determinan las acciones (suspender,
// reprogramar, cobrar) y lo que informa SOAR.
const EDITABLE_INSTALLMENT_STATUSES = ["PENDING", "SUSPENDED"];

export function isEditableInstallmentStatus(status: string): boolean {
  return EDITABLE_INSTALLMENT_STATUSES.includes(status);
}

const MAX_AMOUNT = 99_999_999.99;

// Formulario (cliente): los inputs entregan strings.
export const installmentFormSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine((v) => Number(v) > 0 && Number(v) <= MAX_AMOUNT, "El monto debe ser mayor a 0"),
  /** Pago confirmado: el cliente autorizó el débito de esa fecha y ese monto. */
  confirmed: z.boolean(),
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

// Confirmación de un pago: el cliente autorizó (por teléfono, código TEL) el
// débito de ese monto y esa fecha. Es lo que habilita cobrarlo.
export const confirmSchema = z.object({
  confirmed: z.boolean({ error: "Indica si el pago queda confirmado" }),
});

export const installmentUpdateSchema = z
  .object({
    date: dateField.optional(),
    amount: amountField.optional(),
  })
  .refine((d) => d.date || d.amount, "No hay cambios para guardar");
