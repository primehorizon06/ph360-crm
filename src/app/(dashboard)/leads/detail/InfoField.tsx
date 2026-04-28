interface InfoFieldProps {
  label: string;
  value?: string | null;
}

export function InfoField({ label, value }: InfoFieldProps) {
  return (
    <div>
      <p className="text-sm text-white/40 mb-1">{label}</p>
      <p className="text-lg text-white">{value || "—"}</p>
    </div>
  );
}
