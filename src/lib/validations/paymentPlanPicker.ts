import z from "zod";

export const installmentSchema = z.object({
  installments: z.array(
    z.object({
      number: z.number(),
      date: z.date(),
      amount: z
        .string()
        .min(1, "Requerido")
        .refine((v) => parseFloat(v.replace(",", ".")) > 0, {
          message: "Debe ser mayor a 0",
        }),
    }),
  ),
});

export type InstallmentForm = z.infer<typeof installmentSchema>;