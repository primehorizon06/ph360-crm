"use client";

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export function Loading({
  fullScreen = false,
  message = "Cargando...",
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={`flex items-center justify-center ${
        fullScreen ? "fixed inset-0 z-50 bg-background" : "w-full flex-1"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-outline-variant" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-tertiary animate-spin" />
        </div>
        <p className="text-on-surface-variant text-lg">{message}</p>
      </div>
    </div>
  );
}
