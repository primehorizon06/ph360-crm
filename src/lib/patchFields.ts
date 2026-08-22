export function optionalField(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value || null;
}

export function optionalDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
}

export function optionalNumber(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  return value ? Number(value) : null;
}
