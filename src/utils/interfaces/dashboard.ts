// src/types/dashboard.ts

export interface DashboardKpis {
  newLeads: number;
  prevNewLeads: number;
  conversions: number;
  prevConversions: number;
  ventasHoy: number;
  revenue: number;
  prevRevenue: number;
  revenueDiario: number;
  caida: number;
  cuotasFallidas: number;
  leadsSuspendidos: number;
  pendingApprovals: number;
}

export interface DashboardData {
  companies: { id: number; name: string }[];
  kpis: DashboardKpis;
  installmentStatusDist: { status: string; count: number }[];
  customerStatus: { status: string | null; count: number }[];
  productos: { type: string; count: number }[];
  agentRanking: {
    id: number;
    name: string;
    recaudo: number;
    conversiones: number;
  }[];
  revenuePorDia: { day: number; amount: number }[];
  leadsPerDay: { day: number; count: number }[];
  recaudoPorFranquicia: { companyId: number; name: string; recaudo: number }[];
  meta: {
    year: number;
    month: number;
    quincena: number;
    companyId: number | null;
    teamId: number | null;
    agentId: number | null;
    role: string;
    currentUserId: number;
  };
}

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const PRODUCT_LABELS: Record<string, string> = {
  ALERTA_ANUAL: "Alerta anual",
  ALERTA_TRIMESTRAL: "Alerta trimestral",
  REPARACION_CREDITO: "Reparación crédito",
  FORTALECIMIENTO_FINANCIERO: "Fort. financiero",
};

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  CONTRACT_SENT: "Contrato enviado",
  PENDING_PAYMENT_AGREEMENT: "Acuerdo pago",
  PENDING_DOCS: "Docs pendientes",
  DISPUTE_1: "Disputa 1",
  DISPUTE_2: "Disputa 2",
  DISPUTE_3: "Disputa 3",
  ACTIVE_ALERT: "Alerta activa",
  PENDING_LOYALTY: "Pend. lealtad",
  LOYALTY_OK: "Lealtad ok",
  CANCELLED: "Cancelado",
};

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Pagado",
  PENDING: "Pendiente",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};

export const INSTALLMENT_STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981",
  PENDING: "#f59e0b",
  FAILED: "#ef4444",
  CANCELLED: "#6b7280",
};

export function fmt(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

export function delta(current: number, prev: number) {
  if (prev === 0) return current > 0 ? "+100%" : "—";
  const pct = Math.round(((current - prev) / prev) * 100);
  return (pct >= 0 ? "+" : "") + pct + "%";
}

export function isUp(current: number, prev: number) {
  return current >= prev;
}

export interface Company {
  id: number;
  name: string;
}

export interface DashboardFiltersProps {
  showCompanySelector: boolean;
  companies: Company[];
  companyId: string;
  onCompanyChange: (v: string) => void;
  month: number;
  year: number;
  onDateChange: (month: number, year: number) => void;
  quincena: 1 | 2;
  onQuincenaChange: (v: 1 | 2) => void;
}

export interface FranchiseDashboardProps {
  data: DashboardData | null;
  loading: boolean;
  quincena: 1 | 2;
  companyName?: string;
}

export interface adminDashboardProps {
  data: DashboardData | null;
  loading: boolean;
  quincena: 1 | 2;
}
