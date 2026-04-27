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
  { key: "attachments", label: "Adjuntos" },
  { key: "products", label: "Productos" },
];

export const CUSTOMER_STATUS: Record<string, string> = {
  CONTRACT_SENT: "Contrato enviado",
  PENDING_PAYMENT_AGREEMENT: "Pte acuerdo de pago firmado",
  PENDING_DOCS: "Pte dctos (ss,lic,Bill)",
  DISPUTE_1: "1 disputa",
  DISPUTE_2: "2 disputa",
  DISPUTE_3: "3 disputa",
  ACTIVE_ALERT: "Alerta activa",
  PENDING_LOYALTY: "Pte Fidelización",
  LOYALTY_OK: "Fidelización OK",
  CANCELLED: "Cancelado",
};

export const CUSTOMER_STATUS_COLORS: Record<string, string> = {
  CONTRACT_SENT: "text-amber-400 bg-amber-500/10",
  PENDING_PAYMENT_AGREEMENT: "text-orange-400 bg-orange-500/10",
  PENDING_DOCS: "text-blue-400 bg-blue-500/10",
  DISPUTE_1: "text-cyan-400 bg-cyan-500/10",
  DISPUTE_2: "text-cyan-400 bg-cyan-500/10",
  DISPUTE_3: "text-cyan-400 bg-cyan-500/10",
  ACTIVE_ALERT: "text-pink-400 bg-pink-500/10",
  PENDING_LOYALTY: "text-teal-400 bg-teal-500/10",
  LOYALTY_OK: "text-emerald-400 bg-emerald-500/10",
  CANCELLED: "text-red-400 bg-red-500/10",
};

export const LEAD_FIELDS = [
  { label: "Nombres", name: "firstName", type: "text", required: true },
  { label: "Apellidos", name: "lastName", type: "text", required: false },
  { label: "Teléfono 2", name: "phone2", type: "tel", required: false },
  { label: "Dirección", name: "address", type: "text", required: false },
  { label: "Ciudad", name: "city", type: "text", required: false },
  { label: "Estado/Provincia", name: "state", type: "text", required: false },
  { label: "Código Postal", name: "zipCode", type: "text", required: false },
  { label: "Email", name: "email", type: "email", required: false },
  {
    label: "Fecha de nacimiento",
    name: "birthDate",
    type: "date",
    required: false,
  },
  {
    label: "Hora de contacto",
    name: "contactTime",
    type: "time",
    required: false,
  },
];
