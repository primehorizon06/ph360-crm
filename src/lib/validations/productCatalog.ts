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
    minValue: amount("mínimo"),
    maxValue: amount("máximo").nullable(),
    active: z.boolean(),
    color: z.enum(PRODUCT_COLOR_KEYS as [string, ...string[]], {
      error: "Selecciona un color",
    }),
  })
  .refine((d) => d.maxValue === null || d.minValue <= d.maxValue, {
    message: "El máximo debe ser mayor o igual al mínimo",
    path: ["maxValue"],
  });

export type ProductCatalogFormData = z.infer<typeof productCatalogSchema>;

type Amount = number | string | Prisma.Decimal;

export function checkPlanTotal(
  total: number,
  range: { minValue: Amount; maxValue: Amount | null },
): string | null {
  const min = Number(range.minValue);
  const max = range.maxValue === null ? null : Number(range.maxValue);
  total = Math.round(total * 100) / 100;
  if (total < min)
    return `El total del plan ($ ${formatAmount(total)}) debe ser de al menos $ ${formatAmount(min)}`;
  if (max !== null && total > max)
    return `El total del plan ($ ${formatAmount(total)}) no puede superar $ ${formatAmount(max)}`;
  return null;
}
