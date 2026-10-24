import z from "zod";
import type { Prisma } from "@prisma/client";
import {
  PRODUCT_COLOR_KEYS,
  PRODUCT_MAX_VALUE,
} from "@/utils/constants/products";
import { formatAmount } from "@/utils/helpers/format";

const amount = (label: string) =>
  z
    .number({ error: `Ingresa el valor ${label}` })
    .min(0, "No puede ser negativo")
    .max(PRODUCT_MAX_VALUE, "Valor demasiado alto");

export const productCatalogSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres")
      .max(100, "Máximo 100 caracteres"),
    listPrice: amount("de lista").positive("Debe ser mayor a 0"),
    specialPrice: amount("especial").positive("Debe ser mayor a 0").nullable(),
    active: z.boolean(),
    color: z.enum(PRODUCT_COLOR_KEYS as [string, ...string[]], {
      error: "Selecciona un color",
    }),
  })
  .refine((d) => d.specialPrice === null || d.specialPrice < d.listPrice, {
    message: "El precio especial debe ser menor al de lista",
    path: ["specialPrice"],
  });

export type ProductCatalogFormData = z.infer<typeof productCatalogSchema>;

type Amount = number | string | Prisma.Decimal;

export type PriceType = "LIST" | "SPECIAL";

export function catalogPrice(
  catalog: { listPrice: Amount; specialPrice: Amount | null },
  priceType: PriceType,
): number | null {
  if (priceType === "LIST") return Number(catalog.listPrice);
  return catalog.specialPrice === null ? null : Number(catalog.specialPrice);
}

const toCents = (value: number) => Math.round(value * 100);

export function checkPlanPrice(total: number, price: number): string | null {
  if (toCents(total) === toCents(price)) return null;
  return `El total del plan ($ ${formatAmount(toCents(total) / 100)}) debe ser exactamente $ ${formatAmount(price)}`;
}
