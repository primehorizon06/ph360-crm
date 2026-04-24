import { ProductType } from "../interfaces/products";

export const PRODUCT_LABELS: Record<ProductType, string> = {
  ALERTA_ANUAL: "Alerta Anual",
  ALERTA_TRIMESTRAL: "Alerta Trimestral",
  REPARACION_CREDITO: "Reparación de Crédito",
  FORTALECIMIENTO_FINANCIERO: "Fortalecimiento Financiero",
};

export const PRODUCT_COLORS: Record<ProductType, string> = {
  ALERTA_ANUAL: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  ALERTA_TRIMESTRAL: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  REPARACION_CREDITO: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  FORTALECIMIENTO_FINANCIERO:
    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export const PRODUCTS: ProductType[] = [
  "ALERTA_ANUAL",
  "ALERTA_TRIMESTRAL",
  "REPARACION_CREDITO",
  "FORTALECIMIENTO_FINANCIERO",
];
