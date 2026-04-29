"use client";

import { Ban, Pencil } from "lucide-react";
import { Lead } from "@/utils/interfaces/leads";
import {
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_COLORS,
  STATUS,
  STATUS_COLORS,
} from "@/utils/constants/leads";
import { CopyButton } from "@/components/ui/CopyButton";

interface Props {
  lead: Lead;
  role?: string;
  onSuspend: () => void;
  onEdit: () => void;
}

export function LeadDetailHeader({ lead, role, onSuspend, onEdit }: Props) {
  return (
    <>
      <div className="bg-[#13151c] border border-white/10 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {lead.firstName} {lead.lastName}
              </h1>
              {lead.type === "customer" && (
                <span
                  className={`text-sm px-2 py-0.5 rounded-full font-medium ${CUSTOMER_STATUS_COLORS[lead?.customerStatus as keyof typeof CUSTOMER_STATUS_COLORS]}`}
                >
                  {
                    CUSTOMER_STATUS[
                      lead.customerStatus as keyof typeof CUSTOMER_STATUS
                    ]
                  }
                </span>
              )}
              {lead.type === "lead" && (
                <span
                  className={`text-sm px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead?.status as keyof typeof STATUS_COLORS]}`}
                >
                  {STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS]}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <p className="text-white text-md mt-0.5 font-bold">
                ID{" "}
                <span className="bg-cyan-500/10 text-cyan-400 p-1 rounded">
                  # {lead.id}
                </span>
              </p>
              <CopyButton value={lead.id} label="Copiar ID" />
            </div>
            <div className="flex flex-col flex-wrap gap-x-4 gap-y-1 mt-2">
              <span className="text-lg text-white">
                <strong className="text-lg text-white/60">Teléfono(s):</strong>{" "}
                {lead.phone1}
                {lead.phone2 && <span className="ml-1">/ {lead.phone2}</span>}
              </span>
              {lead.assignedTo?.name && (
                <span className="text-lg text-white/60">
                  <strong>Asesor:</strong> {lead.assignedTo.name}
                </span>
              )}
              {lead.company?.name && (
                <span className="text-lg text-white/60">
                  <strong>Franquicia:</strong> {lead.company.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(role === "ADMIN" || role === "SUPERVISOR") && (
              <button
                onClick={onSuspend}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
              >
                <Ban size={14} />
                Suspender
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-lg transition-colors"
            >
              <Pencil size={14} />
              Editar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
