"use client";

import Link from "next/link";
import { formatAmount } from "@/utils/helpers/format";
import {
  GROUP_STYLES,
  PAYMENT_GROUPS,
  PaymentGroup,
  PaymentsSummary,
} from "@/components/dashboard/paymentGroups";

interface Props {
  summary?: PaymentsSummary;
  /** Card resaltado (en la pantalla de detalle). */
  active?: PaymentGroup;
  /** Cada card como enlace (dashboard) o como botón (pantalla de detalle). */
  hrefFor?: (group: PaymentGroup) => string;
  onSelect?: (group: PaymentGroup) => void;
}

/** Cards de pagos: título y monto de cada grupo, con su degradado. */
export function PaymentCards({ summary, active, hrefFor, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {PAYMENT_GROUPS.map((group) => {
        const style = GROUP_STYLES[group];
        const className = `relative block overflow-hidden text-left rounded-2xl p-5 ring-2 text-white transition-all ${active === group ? style.active : style.card}`;
        const content = (
          <>
            {/* Círculos decorativos */}
            <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
            <span aria-hidden className="pointer-events-none absolute -right-2 -bottom-10 h-20 w-20 rounded-full bg-white/10" />
            <p className="relative text-lg font-semibold text-white/90">{style.title}</p>
            <p className="relative text-3xl font-bold mt-1 drop-shadow-sm">
              $ {formatAmount(summary?.[group].amount ?? 0)}
            </p>
          </>
        );
        return hrefFor ? (
          <Link
            key={group}
            href={hrefFor(group)}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {content}
          </Link>
        ) : (
          <button
            key={group}
            type="button"
            aria-pressed={active === group}
            onClick={() => onSelect?.(group)}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
