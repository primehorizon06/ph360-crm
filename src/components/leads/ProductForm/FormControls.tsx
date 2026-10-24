"use client";

import { KeyboardEvent, ReactNode, useRef } from "react";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-red-400 text-sm">
      {message}
    </p>
  );
}

interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function ChoiceGroup<T extends string>({
  labelId,
  options,
  value,
  onChange,
  errorId,
  invalid,
}: {
  labelId: string;
  options: ChoiceOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  errorId?: string;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={invalid ? errorId : undefined}
      aria-invalid={invalid || undefined}
      className={`grid gap-2 ${options.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (selectedIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex items-center justify-center gap-2 min-h-11 py-2 rounded-lg border text-lg font-medium outline-none focus-visible:ring-2 focus-visible:ring-tertiary/40 transition-all ${
              checked
                ? "border-tertiary/50 bg-tertiary/10 text-tertiary"
                : invalid
                  ? "border-error/40 bg-white/5 text-on-surface-variant hover:text-white/60"
                  : "border-white/10 bg-white/5 text-on-surface-variant hover:text-white/60"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
