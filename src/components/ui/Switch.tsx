"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  "aria-label"?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? "bg-green-500/20 border-green-500/30"
            : "bg-white/10 border-white/20 group-hover:bg-white/20"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full shadow transition-transform ${
            checked ? "translate-x-6 bg-green-400" : "translate-x-1 bg-white/70"
          }`}
        />
      </span>
      {label && (
        <span
          className={`text-sm font-medium w-14 text-left ${checked ? "text-green-400" : "text-on-surface-variant"}`}
        >
          {label}
        </span>
      )}
    </button>
  );
}
