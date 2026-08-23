"use client";

import { CreditCard, Building2, X, Loader2, ShoppingBag } from "lucide-react";
import { ProductFormData } from "@/lib/validations/product";
import { Installment } from "@/utils/interfaces/paymentPlanPicker";
import { PRODUCT_COLORS, PRODUCT_LABELS } from "@/utils/constants/products";
import { formatAmount } from "@/utils/helpers/format";

interface Props {
  data: ProductFormData;
  installments: Installment[];
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmProductModal({
  data,
  installments,
  saving,
  onConfirm,
  onCancel,
}: Props) {
  const total = installments.reduce(
    (acc, i) => acc + parseFloat(i.amount || "0"),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative bg-surface border border-white/10 rounded-2xl p-7 w-full max-w-lg shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white/80 text-xl font-medium">Confirmar producto</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/20 hover:text-white/90 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Badge producto */}
        <span
          className={`inline-flex items-center gap-1.5 text-lg font-medium px-3 py-1 rounded-full border ${PRODUCT_COLORS[data.product]}`}
        >
          <ShoppingBag size={13} />
          {PRODUCT_LABELS[data.product]}
        </span>

        {/* Método de pago */}
        <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-5 space-y-2.5">
          <p className="text-white/90 text-lg uppercase tracking-widest font-medium">
            Método de pago
          </p>
          {data.paymentType === "TARJETA" ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-on-surface-variant" />
                <span className="text-white/70 text-xl">
                  {data.cardType === "DEBITO" ? "Débito" : "Crédito"} ····{" "}
                  {data.lastFour}
                </span>
              </div>
              <p className="text-on-surface-variant text-lg pl-6">
                {data.holderName} · {data.bank}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-on-surface-variant" />
                <span className="text-white/70 text-xl">
                  Cuenta {data.accountNumber}
                </span>
              </div>
              <p className="text-on-surface-variant text-lg pl-6">
                {data.accountHolder} · {data.accountBank}
              </p>
            </div>
          )}
        </div>

        {/* Plan de pagos */}
        <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-5 space-y-2.5">
          <p className="text-white/90 text-lg uppercase tracking-widest font-medium">
            Plan de pagos
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {installments.map((inst) => (
              <div
                key={inst.number}
                className="flex items-center justify-between text-lg"
              >
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-sm">
                    {inst.number}
                  </span>
                  {inst.date.toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <span className="text-white/60">
                  $ {formatAmount(parseFloat(inst.amount))}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-white/90 text-lg">
              {installments.length} cuota{installments.length !== 1 ? "s" : ""}
            </span>
            <span className="text-cyan-400 text-xl font-semibold">
              $ {formatAmount(total)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-white/10 text-on-surface-variant hover:text-white/60 hover:bg-white/5 text-lg transition-colors"
          >
            Revisar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-medium text-lg transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
