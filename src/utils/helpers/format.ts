import { Installment } from "../interfaces/paymentPlanPicker";

export function formatDate(iso: string): string {
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
