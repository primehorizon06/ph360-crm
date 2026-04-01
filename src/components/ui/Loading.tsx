"use client";

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export function Loading({
  fullScreen = true,
  message = "Cargando...",
}: LoadingProps) {
  return (
    <div
      className={`flex items-center justify-center bg-[#0f1117] z-50 ${
        fullScreen ? "fixed inset-0" : "w-full h-full"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
        </div>
        <p className="text-white/40 text-sm">{message}</p>
      </div>
    </div>
  );
}
