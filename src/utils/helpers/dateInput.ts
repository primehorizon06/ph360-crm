// Las fechas de las cuotas se guardan como medianoche local (igual que el
// selector del plan de pagos), así que se convierten en hora local, no en UTC.

/** ISO → valor de un <input type="date"> (YYYY-MM-DD). */
export function toInputDate(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function inputDateToDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Valor de un <input type="date"> → ISO de la medianoche local. */
export function fromInputDate(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}
