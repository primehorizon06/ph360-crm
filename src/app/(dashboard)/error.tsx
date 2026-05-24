"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error(error.message ?? "Error inesperado");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-white/50">
      <p className="text-lg">Ocurrió un error inesperado</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-cyan-500 text-black text-sm font-medium rounded-lg hover:bg-cyan-400 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
