"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface Props {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  saving: boolean;
}

export function RejectModal({ onConfirm, onCancel, saving }: Props) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-[#13151c] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white/80 font-medium">Motivo de rechazo</h3>
          <button
            onClick={onCancel}
            className="text-white/20 hover:text-white/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-white/40 text-lg">
          Explica al asesor qué debe corregir antes de volver a solicitar
          aprobación.
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: Falta el reporte de crédito actualizado..."
          rows={4}
          className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all resize-none"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5 text-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            disabled={saving || !note.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-lg transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Rechazando..." : "Confirmar rechazo"}
          </button>
        </div>
      </div>
    </div>
  );
}
