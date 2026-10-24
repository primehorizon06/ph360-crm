"use client";

import { useRouter } from "next/navigation";

interface PendingConversion {
  id: number;
  name: string;
  requestedAt: string;
}

export function PendingConversionsCard({ leads }: { leads: PendingConversion[] }) {
  const router = useRouter();
  const hasPending = leads.length > 0;

  return (
    <div
      className={`rounded-xl p-4 border ${
        hasPending
          ? "bg-warning/5 border-warning/30"
          : "bg-surface-container border-outline-variant"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {hasPending && (
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning" />
          </span>
        )}
        <p className={`text-lg font-semibold ${hasPending ? "text-warning" : "text-on-surface"}`}>
          Pendientes de aprobación
        </p>
      </div>
      <p className={`text-md mb-3 ${hasPending ? "text-warning/70" : "text-on-surface-variant"}`}>
        Leads esperando aprobación para convertirse en cliente
      </p>

      {hasPending ? (
        <div className="space-y-1">
          {leads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => router.push(`/leads/${lead.id}?tab=products`)}
              className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-warning/10 transition-colors"
            >
              <span className="text-md font-medium text-on-surface truncate">{lead.name}</span>
              <span className="text-md text-warning/70 shrink-0">
                {new Date(lead.requestedAt).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-md text-on-surface-variant text-center py-8">
          Sin leads pendientes de aprobación
        </p>
      )}
    </div>
  );
}
