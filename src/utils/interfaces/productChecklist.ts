import { Product } from "./products";

export interface Props {
  leadId: number;
  products: Product[];
  onApprovalChange: () => void; // refresca el lead después de aprobar/rechazar
}

// ─── Steps definition ─────────────────────────────────────────────────────────

export interface Step {
  id: number;
  label: string;
  situational?: boolean; // paso 4 — solo aplica si no hay reporte
}
