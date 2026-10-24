import z from "zod";
import { parseAmount } from "@/utils/helpers/format";

export const installmentSchema = z.object({
  installments: z.array(
    z.object({
      number: z.number(),
      date: z.date(),
      amount: z
        .string()
        .min(1, "Requerido")
        .refine((v) => parseAmount(v) > 0, {
          message: "Debe ser mayor a 0",
        }),
    }),
  ),
});

export type InstallmentForm = z.infer<typeof installmentSchema>;