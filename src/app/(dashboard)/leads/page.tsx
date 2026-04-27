"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { Plus, Search } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { LeadEditModal } from "@/components/leads/LeadEditModal";
import { useRouter } from "next/navigation";
import { Lead } from "@/utils/interfaces/leads";
import { STATUS, STATUS_COLORS } from "@/utils/constants/leads";
import { CustomSelect } from "@/components/ui/Select";

export default function LeadsPage() {
  const { data: session, status } = useSession();
  const { setLeadsModalOpen, setOnLeadCreated } = useSidebar();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const isAdmin = session?.user?.role === "ADMIN";
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const router = useRouter();

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadLeads();
  }, [status, loadLeads]);

  const filtered = leads.filter((lead) => {
    const matchSearch =
      `${lead.firstName} ${lead.lastName} ${lead.phone1} ${lead.email}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || lead.status === filterStatus;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    setOnLeadCreated(() => loadLeads);
    return () => setOnLeadCreated(null);
  }, [loadLeads, setOnLeadCreated]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${filtered.length} de ${leads.length} leads`}
        action={{
          label: "Nuevo Lead",
          icon: Plus,
          onClick: () => setLeadsModalOpen(true),
        }}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-white/70 placeholder:text-white/30 outline-none w-full"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <CustomSelect
            name="filterStatus"
            value={STATUS[filterStatus] ?? "Todos"}
            onChange={(val) => setFilterStatus(val)}
            options={["ALL", ...Object.keys(STATUS)]}
            labels={["Todos", ...Object.values(STATUS)]}
          />
        </div>
      </div>

      {/* Tabla desktop */}
      <div className="bg-[#13151c] rounded-xl border border-white/10 overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Nombre",
                  "Teléfono",
                  ...(isAdmin ? ["Franquicia"] : []),
                  "Agente",
                  "Equipo",
                  "Estado",
                  "Fecha"
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/70">
                    {lead.phone1}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-white/50">
                      {lead.company?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-white/50">
                    {lead.assignedTo?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/50">
                    {lead.assignedTo?.team?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status]}`}
                    >
                      {STATUS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/30">
                    {new Date(lead.createdAt).toLocaleDateString("es-CO")}
                  </td>
                  {/* <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingLead(lead)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tarjetas móvil */}
        <div className="md:hidden divide-y divide-white/5">
          {filtered.map((lead) => (
            <div
              key={lead.id}
              onClick={() => router.push(`/leads/${lead.id}`)}
              className="p-4 space-y-2 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-medium text-sm">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-white/40 text-xs">{lead.phone1}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[lead.status]}`}
                >
                  {STATUS[lead.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                {lead.city && <span>{lead.city}</span>}
                {lead.company?.name && <span>{lead.company.name}</span>}
                {lead.assignedTo?.name && <span>{lead.assignedTo.name}</span>}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">
            No hay leads registrados
          </div>
        )}
      </div>
      {editingLead && (
        <LeadEditModal
          key={editingLead.id}
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSave={() => {
            setEditingLead(null);
            loadLeads();
          }}
        />
      )}
    </div>
  );
}
