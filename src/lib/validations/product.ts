import z from "zod";

const tarjetaSchema = z.object({
  catalogId: z.string({ error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
  paymentType: z.literal("TARJETA"),
  cardType: z.enum(["DEBITO", "CREDITO"], {
    error: "Selecciona débito o crédito",
  }),
  lastFour: z
    .string()
    .length(4, "Deben ser exactamente 4 dígitos")
    .regex(/^\d{4}$/, "Solo números"),
  holderName: z.string().min(1, "Ingresa el nombre del titular"),
  bank: z.string().min(1, "Ingresa el banco"),
});

const cuentaSchema = z.object({
  catalogId: z.string({ error: "Selecciona un producto" }).min(1, "Selecciona un producto"),
  paymentType: z.literal("CUENTA"),
  accountNumber: z.string().min(1, "Ingresa el número de cuenta"),
  accountHolder: z.string().min(1, "Ingresa el titular de la cuenta"),
  accountBank: z.string().min(1, "Ingresa el banco"),
  routingNumber: z
    .string()
    .min(9, "El número de ruta debe tener 9 dígitos")
    .max(9, "El número de ruta debe tener 9 dígitos"),
  accountType: z.enum(["AHORROS", "CHEQUES"], {
    error: "Selecciona el tipo de cuenta",
  }),
});

const priceFields = {
  priceType: z.enum(["LIST", "SPECIAL"], { error: "Selecciona el precio" }),
  priceAuthorizedById: z.string().regex(/^\d+$/, "Autorizador inválido").optional(),
};

export const productSchema = z
  .discriminatedUnion("paymentType", [
    tarjetaSchema.extend(priceFields),
    cuentaSchema.extend(priceFields),
  ])
  .superRefine((data, ctx) => {
    if (data.priceType === "SPECIAL" && !data.priceAuthorizedById) {
      ctx.addIssue({
        path: ["priceAuthorizedById"],
        code: "custom",
        message: "Selecciona quién de CS Holding lo autorizó",
      });
    }
  });

export type ProductFormData = z.infer<typeof productSchema>;

// Edición del método de pago de un producto existente: el tipo (tarjeta o
// cuenta) no cambia, solo sus datos.
export const cardDetailsSchema = tarjetaSchema.omit({ catalogId: true, paymentType: true });
export const accountDetailsSchema = cuentaSchema.omit({ catalogId: true, paymentType: true });

export type CardDetailsFormData = z.infer<typeof cardDetailsSchema>;
export type AccountDetailsFormData = z.infer<typeof accountDetailsSchema>;

export const productStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"], { error: "Estado inválido" }),
});
