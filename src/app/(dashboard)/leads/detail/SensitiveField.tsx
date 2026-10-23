"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

type RevealedValues = Record<string, string | null>;

function useReveal(revealUrl: string, label: string) {
  const [values, setValues] = useState<RevealedValues | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (values) {
      setValues(null);
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
      setValues(data);
    } finally {
      setLoading(false);
    }
  }

  return { values, loading, toggle };
}

function RevealButton({
  label,
  revealed,
  loading,
  onClick,
}: {
  label: string;
  revealed: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  );
}

interface SensitiveFieldProps {
  label: string;
  maskedValue?: string | null;
  revealUrl: string;
  responseKey: string;
}

export function SensitiveField({ label, maskedValue, revealUrl, responseKey }: SensitiveFieldProps) {
  const { values, loading, toggle } = useReveal(revealUrl, label);

  return (
    <div className="min-w-0">
      <p className="text-sm text-on-surface-variant mb-1">{label}</p>
      {maskedValue ? (
        <div className="flex items-center gap-2">
          <p className="text-lg text-white font-mono [overflow-wrap:anywhere]">
            {values ? values[responseKey] : maskedValue}
          </p>
          <RevealButton label={label} revealed={!!values} loading={loading} onClick={toggle} />
        </div>
      ) : (
        <p className="text-lg text-white">—</p>
      )}
    </div>
  );
}

interface BankNumbersFieldProps {
  maskedAccount?: string | null;
  maskedRouting?: string | null;
  revealUrl: string;
}

export function BankNumbersField({ maskedAccount, maskedRouting, revealUrl }: BankNumbersFieldProps) {
  const { values, loading, toggle } = useReveal(revealUrl, "la cuenta bancaria");

  return (
    <div className="flex items-start gap-2 min-w-0 text-white/90 text-lg">
      <div className="min-w-0">
        <p className="truncate">
          Cuenta: <span className="font-mono">{(values ? values.accountNumber : maskedAccount) ?? "—"}</span>
        </p>
        <p className="truncate">
          Ruta: <span className="font-mono">{(values ? values.routingNumber : maskedRouting) ?? "—"}</span>
        </p>
      </div>
      {(maskedAccount || maskedRouting) && (
        <RevealButton
          label="la cuenta bancaria"
          revealed={!!values}
          loading={loading}
          onClick={toggle}
        />
      )}
    </div>
  );
}
