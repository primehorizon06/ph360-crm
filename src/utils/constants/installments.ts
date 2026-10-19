// Estado de un pago del plan, para mostrarlo en la interfaz.

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  SUSPENDED: "Suspendido",
  PROCESSING: "En proceso",
  PAID: "Pagado",
  FAILED: "Devuelto",
  CHARGEBACK: "Contracargo",
  CANCELLED: "Cancelado",
};

export const INSTALLMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  SUSPENDED: "bg-attention/10 text-attention",
  PROCESSING: "bg-tertiary/10 text-tertiary",
  PAID: "bg-success/10 text-success",
  FAILED: "bg-error/10 text-error",
  CHARGEBACK: "bg-error/10 text-error",
  CANCELLED: "bg-surface-variant text-on-surface-variant",
};
