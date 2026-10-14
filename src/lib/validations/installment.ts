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

export const installmentUpdateSchema = z
  .object({
    date: dateField.optional(),
    amount: amountField.optional(),
    status: z.enum(MANUAL_INSTALLMENT_STATUSES, { error: "Estado inválido" }).optional(),
  })
  .refine((d) => d.date || d.amount || d.status, "No hay cambios para guardar");
