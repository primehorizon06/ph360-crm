import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { RejectModal } from "../../RejectModal/RejectModal";
import { PRODUCT_LABELS } from "@/utils/constants/products";
import { Product } from "@/utils/interfaces/products";
import { useState } from "react";
import {
  ALL_STEPS_APPROVAL,
  PRE_CHECKED_FOR_SUBSEQUENT,
} from "@/utils/constants/productChecklist";
import { buildInitialChecked } from "@/utils/helpers/buildInitialChecked";

export function ProductChecklistItem({
  leadId,
  product,
  onApprovalChange,
}: {
  leadId: number;
  product: Product;
  onApprovalChange: () => void;
}) {
  const approval = product.approval;
  const isFirstProduct = approval?.isFirstProduct ?? true;

  const [checked, setChecked] = useState<Record<number, boolean>>(
    buildInitialChecked(isFirstProduct),
  );
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  if (!approval || approval.status !== "PENDING") return null;

  // El paso 4 es situacional — no bloquea si no está marcado
  const requiredSteps = ALL_STEPS_APPROVAL.filter((s) => !s.situational);
  const allRequiredChecked = requiredSteps.every((s) => checked[s.id]);

  const checkedCount = ALL_STEPS_APPROVAL.filter((s) => checked[s.id]).length;
  //   const totalRequired = requiredSteps.length;

  function toggle(stepId: number) {
    setChecked((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }

  async function handleApprove() {
    setSaving(true);
    await fetch(`/api/leads/${leadId}/products/${product.id}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    setSaving(false);
    onApprovalChange();
  }

  async function handleReject(note: string) {
    setSaving(true);
    await fetch(`/api/leads/${leadId}/products/${product.id}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECT", note }),
    });
    setSaving(false);
    setShowRejectModal(false);
    onApprovalChange();
  }

  return (
    <>
      <div className="bg-[#13151c] border border-amber-500/20 rounded-xl overflow-hidden">
        {/* Header del producto */}
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20">
              <ShoppingBag size={11} />
              {PRODUCT_LABELS[product.product as keyof typeof PRODUCT_LABELS]}
            </span>
            <span className="text-white/30 text-sm">
              {checkedCount}/{ALL_STEPS_APPROVAL.length} revisados
            </span>
          </div>
          {expanded ? (
            <ChevronUp size={14} className="text-white/30" />
          ) : (
            <ChevronDown size={14} className="text-white/30" />
          )}
        </button>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-amber-500/60 transition-all duration-300"
            style={{
              width: `${(checkedCount / ALL_STEPS_APPROVAL.length) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        {expanded && (
          <div className="px-4 py-3 space-y-2">
            {ALL_STEPS_APPROVAL.map((step) => {
              const isPreChecked =
                !isFirstProduct && PRE_CHECKED_FOR_SUBSEQUENT.includes(step.id);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => !isPreChecked && toggle(step.id)}
                  disabled={isPreChecked}
                  className={`w-full flex items-center gap-3 text-left py-1.5 transition-colors group ${
                    isPreChecked
                      ? "cursor-default opacity-60"
                      : "cursor-pointer"
                  }`}
                >
                  {checked[step.id] ? (
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 shrink-0"
                    />
                  ) : (
                    <Circle
                      size={16}
                      className="text-white/20 shrink-0 group-hover:text-white/40 transition-colors"
                    />
                  )}
                  <span
                    className={`text-lg transition-colors ${
                      checked[step.id]
                        ? "text-white/60 line-through"
                        : "text-white/70"
                    }`}
                  >
                    {step.label}
                    {step.situational && (
                      <span className="ml-1.5 text-[10px] text-white/30 no-underline">
                        situacional
                      </span>
                    )}
                  </span>
                  {isPreChecked && (
                    <span className="ml-auto text-[10px] text-white/20 shrink-0">
                      ya validado
                    </span>
                  )}
                </button>
              );
            })}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={saving}
                className="flex-1 py-2 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-lg transition-colors disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={saving || !allRequiredChecked}
                title={
                  !allRequiredChecked
                    ? "Completa todos los pasos requeridos"
                    : undefined
                }
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-lg transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving
                  ? "Guardando..."
                  : isFirstProduct
                    ? "Aprobar y convertir"
                    : "Aprobar producto"}
              </button>
            </div>

            {!allRequiredChecked && (
              <p className="text-amber-400/60 text-sm text-center">
                Completa todos los pasos requeridos para aprobar
              </p>
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <RejectModal
          saving={saving}
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
}
