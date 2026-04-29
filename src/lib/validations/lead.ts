import { z } from "zod";

export const leadSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().optional().or(z.literal("")),
  phone1: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Formato inválido. Ej: (787) 555-1234")
    .min(1, "El teléfono es requerido"),
  phone2: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Formato inválido. Ej: (787) 555-1234")
    .optional()
    .or(z.literal("")),
  ssn: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{4}$/, "Formato inválido. Ej: 123-45-6789")
    .optional()
    .or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  contactTime: z.string().optional().or(z.literal("")),
  status: z.string(),
  customerStatus: z.string().optional().or(z.literal("")),
});

export type LeadFormData = z.infer<typeof leadSchema>;
