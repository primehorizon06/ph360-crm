import { TABS_NAME } from "../interfaces/leads";

export const STATUS: Record<string, string> = {
  newLead: "Lead nuevo",
  leadWithData: "Lead con datos",
  pendingSS: "Pendiente S.S",
  pendingAnalysis: "Pendiente análisis",
  pendingAccount: "Pendiente cuenta",
  pendingPayments: "Pendiente pagos",
  suspended: "Suspendido",
};

export const STATUS_COLORS: Record<string, string> = {
  newLead: "bg-blue-500/20 text-blue-400",
  leadWithData: "bg-cyan-500/20 text-cyan-400",
  pendingSS: "bg-yellow-500/20 text-yellow-400",
  pendingAnalysis: "bg-purple-500/20 text-purple-400",
  pendingAccount: "bg-orange-500/20 text-orange-400",
  pendingPayments: "bg-red-500/20 text-red-400",
  suspended: "bg-gray-500/20 text-gray-400",
};

export const TABS: { key: TABS_NAME; label: string }[] = [
  { key: "personal", label: "Datos Personales" },
  { key: "notes", label: "Notas" },
  { key: "reminders", label: "Recordatorios" },
  { key: "documents", label: "Adjuntos" },
  { key: "products", label: "Productos" },
];
