import { z } from "zod";

const scopeId = z.coerce
  .number({ error: "Id inválido" })
  .int("Id inválido")
  .positive("Id inválido")
  .optional();

export const goalCreateSchema = z
  .object({
    year: z.coerce
      .number({ error: "Año inválido" })
      .int("Año inválido")
      .min(2000, "Año inválido")
      .max(2100, "Año inválido"),
    month: z.coerce
      .number({ error: "Mes inválido" })
      .int("Mes inválido")
      .min(1, "Mes inválido")
      .max(12, "Mes inválido"),
    quincena: z.coerce
      .number({ error: "Quincena inválida" })
      .refine((v) => v === 1 || v === 2, "Quincena inválida"),
    amount: z.coerce.number({ error: "Monto inválido" }).positive("El monto debe ser mayor a 0"),
    companyId: scopeId,
    teamId: scopeId,
    userId: scopeId,
  })
  .refine(
    (data) => [data.companyId, data.teamId, data.userId].filter(Boolean).length === 1,
    "Debe definir exactamente un scope: companyId, teamId o userId",
  );
