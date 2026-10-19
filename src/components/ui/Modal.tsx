"use client";

import { ReactNode } from "react";
import { X, Loader2 } from "lucide-react";

export const modalInputClass =
  "w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-tertiary/50 focus:ring-1 focus:ring-tertiary/20 transition-all";

export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-surface border border-white/10 rounded-2xl p-6 w-full ${size === "lg" ? "max-w-lg" : "max-w-md"} shadow-2xl space-y-4`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white/80 font-medium">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/20 hover:text-white/90 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({
  onClose,
  saving,
  label = "Guardar",
  closeLabel = "Cancelar",
}: {
  onClose: () => void;
  saving: boolean;
  label?: string;
  /** Texto del botón que cierra; cámbialo si la acción misma se llama "Cancelar ...". */
  closeLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-lg text-white/90 hover:text-white transition-colors"
      >
        {closeLabel}
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 text-lg bg-action hover:bg-action-hover text-on-action font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? "Guardando..." : label}
      </button>
    </div>
  );
}
