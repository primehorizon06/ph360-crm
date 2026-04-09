"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import { ArrowLeft, Ban, Pencil } from "lucide-react";
import { LeadEditModal } from "@/components/leads/LeadEditModal";
import { useSession } from "next-auth/react";
import { Lead, TABS_NAME } from "@/utils/interfaces/leads";
import { STATUS, STATUS_COLORS, TABS } from "@/utils/constants/leads";

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<TABS_NAME>("personal");

  async function loadLead() {
    setLoading(true);
    const res = await fetch(`/api/leads/${id}`);
    if (!res.ok) {
      router.push("/leads");
      return;
    }
    setLead(await res.json());
    setLoading(false);
  }

  async function handleSuspend() {
    if (!confirm("¿Suspender este lead?")) return;
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "suspended" }),
    });
    loadLead();
  }

  useEffect(() => {
    loadLead();
  }, [id]);

  if (loading) return <Loading />;
  if (!lead) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/leads")}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        Volver a Leads
      </button>

      {/* Card fija con info relevante */}
      <div className="bg-[#13151c] border border-white/10 rounded-xl p-5 sticky top-16 z-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Info principal */}
          <div className="flex items-start gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">
                  {lead.firstName} {lead.lastName}
                </h1>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status]}`}
                >
                  {STATUS[lead.status]}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5">Lead #{lead.id}</p>

              {/* Datos rápidos */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="text-sm text-white/60">
                  Telefono(s): {lead.phone1}
                  {lead.phone2 && (
                    <span className="ml-2 text-white/40">/ {lead.phone2}</span>
                  )}
                </span>
                {lead.assignedTo?.name && (
                  <span className="text-sm text-white/60">
                    Asesor: {lead.assignedTo.name}
                  </span>
                )}
                {lead.company?.name && (
                  <span className="text-sm text-white/60">
                    Franquicia: {lead.company.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 shrink-0">
            {(role === "ADMIN" || role === "SUPERVISOR") && (
              <button
                onClick={handleSuspend}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
              >
                <Ban size={14} />
                Suspender
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Pencil size={14} />
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-white/40 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del tab */}
      <div>
        {activeTab === "personal" && <PersonalTab lead={lead} />}
        {activeTab === "notes" && <ComingSoon label="Notas" />}
        {activeTab === "reminders" && <ComingSoon label="Recordatorios" />}
        {activeTab === "documents" && <ComingSoon label="Adjuntos" />}
        {activeTab === "products" && <ComingSoon label="Productos" />}
      </div>

      {editing && (
        <LeadEditModal
          key={lead.id}
          lead={lead}
          onClose={() => setEditing(false)}
          onSave={() => {
            setEditing(false);
            loadLead();
          }}
        />
      )}
    </div>
  );
}
