import { Installment } from "../interfaces/paymentPlanPicker";

export function formatDate(iso: string | Date): string {
  const date = new Date(iso);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleDateString("es-CO", { month: "long" });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTotalAmount(installments: Installment[]): string {
  const total = installments.reduce((acc, i) => {
    const val = parseFloat(i.amount.replace(",", "."));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  return total.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length > 6)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length > 3) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length > 0) return `(${digits}`;
  return "";
}

export function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace(/\s/g, "");
}
