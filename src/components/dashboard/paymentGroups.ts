// Grupos de pagos del dashboard y de la pantalla de detalle (/payments).

export const PAYMENT_GROUPS = ["transfer", "processing", "approved", "fallen"] as const;
export type PaymentGroup = (typeof PAYMENT_GROUPS)[number];

export function isPaymentGroup(value: string | null | undefined): value is PaymentGroup {
  return !!value && (PAYMENT_GROUPS as readonly string[]).includes(value);
}

// Clases completas (sin concatenar) para que Tailwind las genere. Los colores
// son tokens de globals.css: degradado del tono claro al profundo.
export const GROUP_STYLES: Record<
  PaymentGroup,
  { title: string; empty: string; card: string; active: string; accent: string }
> = {
  transfer: {
    title: "Transfer",
    empty: "No hay pagos confirmados sin enviar en esta quincena",
    card: "bg-linear-to-br from-neon-blue to-neon-blue-deep ring-white/0 hover:brightness-110",
    active:
      "bg-linear-to-br from-neon-blue to-neon-blue-deep ring-white shadow-[0_0_28px_-4px_var(--color-neon-blue)]",
    accent: "text-neon-blue",
  },
  processing: {
    title: "Proceso SOAR",
    empty: "No hay pagos en proceso en SOAR en esta quincena",
    card: "bg-linear-to-br from-neon-purple to-neon-purple-deep ring-white/0 hover:brightness-110",
    active:
      "bg-linear-to-br from-neon-purple to-neon-purple-deep ring-white shadow-[0_0_28px_-4px_var(--color-neon-purple)]",
    accent: "text-neon-purple",
  },
  approved: {
    title: "Aprobados",
    empty: "No hay pagos aprobados en esta quincena",
    card: "bg-linear-to-br from-neon-green to-neon-green-deep ring-white/0 hover:brightness-110",
    active:
      "bg-linear-to-br from-neon-green to-neon-green-deep ring-white shadow-[0_0_28px_-4px_var(--color-neon-green)]",
    accent: "text-neon-green",
  },
  fallen: {
    title: "Caída",
    empty: "No hay pagos suspendidos ni devueltos en esta quincena",
    card: "bg-linear-to-br from-neon-red to-neon-red-deep ring-white/0 hover:brightness-110",
    active:
      "bg-linear-to-br from-neon-red to-neon-red-deep ring-white shadow-[0_0_28px_-4px_var(--color-neon-red)]",
    accent: "text-neon-red",
  },
};

export type PaymentsSummary = Record<PaymentGroup, { amount: number; count: number }>;

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "1ª quincena de octubre 2026" */
export function quincenaLabel(year: number, month: number, quincena: 1 | 2): string {
  return `${quincena}ª quincena de ${MONTHS[month - 1]} ${year}`;
}
