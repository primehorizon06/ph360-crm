interface InfoFieldProps {
  label: string;
  value?: string | null;
}

export function InfoField({ label, value }: InfoFieldProps) {
  return (
    <div>
      <p className="text-sm text-on-surface-variant mb-1">{label}</p>
      <p className="text-lg text-white">{value || "—"}</p>
    </div>
  );
}
