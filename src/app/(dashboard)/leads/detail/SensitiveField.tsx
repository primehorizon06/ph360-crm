"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SensitiveFieldProps {
  label: string;
  maskedValue?: string | null;
  revealUrl: string;
}

export function SensitiveField({ label, maskedValue, revealUrl }: SensitiveFieldProps) {
  const [plainValue, setPlainValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const revealed = plainValue !== null;

  async function toggle() {
    if (revealed) {
      setPlainValue(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(revealUrl, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? `No se pudo mostrar ${label.toLowerCase()}`);
        return;
      }
      setPlainValue(data.ssn ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0">
      <p className="text-sm text-on-surface-variant mb-1">{label}</p>
      {maskedValue ? (
        <div className="flex items-center gap-2">
          <p className="text-lg text-white font-mono [overflow-wrap:anywhere]">
            {revealed ? plainValue : maskedValue}
          </p>
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            aria-label={revealed ? `Ocultar ${label}` : `Mostrar ${label}`}
            aria-pressed={revealed}
            title={revealed ? undefined : "Queda registrado en la auditoría"}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-tertiary/60 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : revealed ? (
              <EyeOff size={16} />
            ) : (
              <Eye size={16} />
            )}
          </button>
        </div>
      ) : (
        <p className="text-lg text-white">—</p>
      )}
    </div>
  );
}
