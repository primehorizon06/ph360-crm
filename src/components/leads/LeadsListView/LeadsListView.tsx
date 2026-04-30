"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { Plus, Search } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useRouter } from "next/navigation";
import { Lead } from "@/utils/interfaces/leads";
import {
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_COLORS,
  STATUS,
  STATUS_COLORS,
} from "@/utils/constants/leads";
import { CustomSelect } from "@/components/ui/Select";
import { PRODUCT_COLORS, PRODUCT_LABELS } from "@/utils/constants/products";
import { ProductType } from "@/utils/interfaces/products";

interface Props {
  type: "lead" | "customer";
}

export function LeadsListView({ type }: Props) {
  const { data: session, status } = useSession();
  const { setLeadsModalOpen, setOnLeadCreated } = useSidebar();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const isAdmin = session?.user?.role === "ADMIN";
  const router = useRouter();

  const isLead = type === "lead";
  const label = isLead ? "Lead" : "Cliente";
  const basePath = isLead ? "/leads" : "/customers";

  const statusOptions = isLead ? STATUS : CUSTOMER_STATUS;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leads?type=${type}`);
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    if (status === "authenticated") loadLeads();
  }, [status, loadLeads]);

  const filtered = leads.filter((lead) => {
    const matchSearch =
      `${lead.firstName} ${lead.lastName} ${lead.phone1} ${lead.email}`
        .toLowerCase()
        .includes(search.toLowerCase());

    if (isLead) {
      const matchStatus =
        filterStatus === "ALL" || lead.status === filterStatus;
      return matchSearch && matchStatus;
    } else {
      const matchStatus =
        filterStatus === "ALL" || lead.customerStatus === filterStatus;
      return matchSearch && matchStatus;
    }
  });

  useEffect(() => {
    if (isLead) {
      setOnLeadCreated(() => loadLeads);
      return () => setOnLeadCreated(null);
    }
  }, [loadLeads, setOnLeadCreated, isLead]);

  if (loading) return <Loading />;

  const headers = [
    "Nombre",
    "Teléfono",
    ...(isAdmin ? ["Franquicia"] : []),
    "Agente",
    "Equipo",
    ...(isLead ? ["Estado"] : ["Producto(s)", "Estado"]),
    isLead ? "Fecha creación lead" : "Fecha creación cliente",
  ];

  return (
    <div className="w-full  mx-auto px-4 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title={isLead ? "Leads" : "Clientes"}
        description={`${filtered.length} de ${leads.length} ${label.toLowerCase()}s`}
        action={
          isLead
            ? {
                label: `Nuevo ${label}`,
                icon: Plus,
                onClick: () => setLeadsModalOpen(true),
              }
            : undefined
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            type="text"
            placeholder={`Buscar por nombre, teléfono, email...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-lg text-white/70 placeholder:text-white/30 outline-none w-full"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <CustomSelect
            name="filterStatus"
            value={
              filterStatus === "ALL"
                ? "Todos"
                : (statusOptions[filterStatus] ?? "Todos")
            }
            onChange={(val) => setFilterStatus(val)}
            options={["ALL", ...Object.keys(statusOptions)]}
            labels={["Todos", ...Object.values(statusOptions)]}
          />
        </div>
      </div>

      {/* Tabla desktop */}
      <div className="bg-[#13151c] rounded-xl border border-white/10 overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-sm text-white/40 font-medium uppercase tracking-wider"
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
                  onClick={() => router.push(`${basePath}/${lead.id}`)}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-lg text-white font-medium">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="px-4 py-3 text-lg text-white/70">
                    {lead.phone1}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-lg text-white/50">
                      {lead.company?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-lg text-white/50">
                    {lead.assignedTo?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-lg text-white/50">
                    {lead.assignedTo?.team?.name ?? "—"}
                  </td>

                  {isLead ? (
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm px-2 py-1 rounded-full font-medium ${STATUS_COLORS[lead.status]}`}
                      >
                        {STATUS[lead.status]}
                      </span>
                    </td>
                  ) : (
                    <>
                      {/* Productos */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {lead.products && lead.products.length > 0 ? (
                            lead.products.map((p) => (
                              <span
                                key={p.id}
                                className={`text-sm px-2 py-0.5 rounded-full border font-medium ${PRODUCT_COLORS[p.product as ProductType]}`}
                              >
                                {PRODUCT_LABELS[p.product as ProductType]}
                              </span>
                            ))
                          ) : (
                            <span className="text-white/20 text-sm">—</span>
                          )}
                        </div>
                      </td>
                      {/* Estado cliente */}
                      <td className="px-4 py-3">
                        {lead.customerStatus ? (
                          <span
                            className={`text-sm px-2 py-1 rounded-full font-medium ${CUSTOMER_STATUS_COLORS[lead.customerStatus]}`}
                          >
                            {CUSTOMER_STATUS[lead.customerStatus]}
                          </span>
                        ) : (
                          <span className="text-white/20 text-sm">—</span>
                        )}
                      </td>
                    </>
                  )}

                  <td className="px-4 py-3 text-sm text-white/30">
                    {isLead
                      ? new Date(lead.createdAt).toLocaleDateString("es-CO")
                      : lead.convertedAt
                        ? new Date(lead.convertedAt).toLocaleDateString("es-CO")
                        : "—"}
                  </td>
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
              onClick={() => router.push(`${basePath}/${lead.id}`)}
              className="p-4 space-y-2 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-medium text-lg">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-white/40 text-sm">{lead.phone1}</p>
                </div>
                {isLead ? (
                  <span
                    className={`text-sm px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[lead.status]}`}
                  >
                    {STATUS[lead.status]}
                  </span>
                ) : lead.customerStatus ? (
                  <span
                    className={`text-sm px-2 py-0.5 rounded-full font-medium shrink-0 ${CUSTOMER_STATUS_COLORS[lead.customerStatus]}`}
                  >
                    {CUSTOMER_STATUS[lead.customerStatus]}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/40">
                {lead.city && <span>{lead.city}</span>}
                {lead.company?.name && <span>{lead.company.name}</span>}
                {lead.assignedTo?.name && <span>{lead.assignedTo.name}</span>}
              </div>
              {!isLead && lead.products && lead.products.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lead.products.map((p) => (
                    <span
                      key={p.id}
                      className="text-sm px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    >
                      {p.product.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/30 text-lg">
            No hay {label.toLowerCase()}s registrados
          </div>
        )}
      </div>
    </div>
  );
}
