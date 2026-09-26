import { formatAmount } from "@/utils/helpers/format";

export const PRODUCT_COLORS = {
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
} as const;

export type ProductColor = keyof typeof PRODUCT_COLORS;

export const PRODUCT_COLOR_KEYS = Object.keys(PRODUCT_COLORS) as ProductColor[];

export function productColorClass(color: string | null | undefined): string {
  return PRODUCT_COLORS[color as ProductColor] ?? PRODUCT_COLORS.cyan;
}

export const PRODUCT_MAX_VALUE = 99999999.99;

export function formatProductRange(p: {
  minValue: string | number;
  maxValue: string | number | null;
}): string {
  const min = `$ ${formatAmount(Number(p.minValue))}`;
  return p.maxValue === null
    ? `Desde ${min}`
    : `${min} – $ ${formatAmount(Number(p.maxValue))}`;
}
