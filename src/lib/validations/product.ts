import z from "zod";

const tarjetaSchema = z.object({
  product: z.enum(
    [
      "ALERTA_ANUAL",
      "ALERTA_TRIMESTRAL",
      "REPARACION_CREDITO",
      "FORTALECIMIENTO_FINANCIERO",
    ],
    {
      required_error: "Selecciona un producto",
    },
  ),
  paymentType: z.literal("TARJETA"),
  cardType: z.enum(["DEBITO", "CREDITO"], {
    required_error: "Selecciona débito o crédito",
  }),
  lastFour: z
    .string()
    .length(4, "Deben ser exactamente 4 dígitos")
    .regex(/^\d{4}$/, "Solo números"),
  holderName: z.string().min(1, "Ingresa el nombre del titular"),
  bank: z.string().min(1, "Ingresa el banco"),
});

const cuentaSchema = z.object({
  product: z.enum(
    [
      "ALERTA_ANUAL",
      "ALERTA_TRIMESTRAL",
      "REPARACION_CREDITO",
      "FORTALECIMIENTO_FINANCIERO",
    ],
    {
      required_error: "Selecciona un producto",
    },
  ),
  paymentType: z.literal("CUENTA"),
  accountNumber: z.string().min(1, "Ingresa el número de cuenta"),
  accountHolder: z.string().min(1, "Ingresa el titular de la cuenta"),
  accountBank: z.string().min(1, "Ingresa el banco"),
  routingNumber: z
    .string()
    .min(9, "El número de ruta debe tener 9 dígitos")
    .max(9, "El número de ruta debe tener 9 dígitos"),
  accountType: z.enum(["AHORROS", "CHEQUES"], {
    required_error: "Selecciona el tipo de cuenta",
  }),
});

export const productSchema = z.discriminatedUnion("paymentType", [
  tarjetaSchema,
  cuentaSchema,
]);

export type ProductFormData = z.infer<typeof productSchema>;
