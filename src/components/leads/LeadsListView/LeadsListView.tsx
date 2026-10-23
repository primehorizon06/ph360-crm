"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Plus, Search, X } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lead } from "@/utils/interfaces/leads";
import {
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_COLORS,
  STATUS,
  STATUS_COLORS,
} from "@/utils/constants/leads";
import { CustomSelect } from "@/components/ui/Select";
import { productColorClass } from "@/utils/constants/products";
import { UserRole } from "@/utils/constants/roles";
import { canCreateLead, isGlobalRole } from "@/lib/permissions";
import { fetcher } from "@/lib/fetcher";

const LIMIT = 50;
const FILTER_LABEL = "block text-sm text-on-surface-variant";

interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  type: "lead" | "customer";
}

export function LeadsListView({ type }: Props) {
  const { data: session, status } = useSession();
  const { setLeadsModalOpen, setOnLeadCreated } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const debouncedSearch = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "ALL";
  const filterAgent = searchParams.get("agent") ?? "";
  const filterProduct = searchParams.get("product") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const [search, setSearch] = useState(debouncedSearch);
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  // Un agente solo ve sus propios leads: no necesita filtrar por agente.
  const canFilterAgent = status === "authenticated" && session?.user?.role !== UserRole.AGENT;
  const hasFilters =
    filterStatus !== "ALL" || !!filterAgent || !!filterProduct || !!dateFrom || !!dateTo;

  const isLead = type === "lead";
  const label = isLead ? "Lead" : "Cliente";
  const basePath = isLead ? "/leads" : "/customers";
  const statusOptions = isLead ? STATUS : CUSTOMER_STATUS;

  const updateParams = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value && value !== "ALL") params.set(key, value);
        else params.delete(key);
      }
      if (!("page" in patch) || patch.page === "1") params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // Debounce search: la URL se actualiza en el callback del timer, no directo en el efecto
  useEffect(() => {
    if (search === debouncedSearch) return;
    const t = setTimeout(() => updateParams({ q: search }), 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch, updateParams]);

  function openRow(e: React.MouseEvent, href: string) {
    if ((e.target as HTMLElement).closest("a")) return;
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  const swrKey = useMemo(() => {
    if (status !== "authenticated") return null;
    const params = new URLSearchParams({ type, page: String(page), limit: String(LIMIT) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    if (filterAgent) params.set("agentId", filterAgent);
    if (filterProduct) params.set("catalogId", filterProduct);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/leads?${params}`;
  }, [status, type, page, debouncedSearch, filterStatus, filterAgent, filterProduct, dateFrom, dateTo]);

  const { data, isLoading, mutate } = useSWR<LeadsResponse>(swrKey, fetcher, {
    keepPreviousData: true,
  });
  const { data: agents = [] } = useSWR<{ id: number; name: string; company: { name: string } | null }[]>(
    canFilterAgent ? "/api/users/agents" : null,
    fetcher,
  );
  const { data: catalog = [] } = useSWR<{ id: number; name: string }[]>(
    status === "authenticated" ? "/api/product-catalog" : null,
    fetcher,
  );

  function clearFilters() {
    updateParams({ status: "", agent: "", product: "", from: "", to: "" });
  }

  const leads = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const headers = useMemo(
    () => [
      "ID",
      "Nombre",
      "Teléfono",
      ...(isAdmin ? ["Franquicia"] : []),
      "Agente",
      "Equipo",
      ...(isLead ? ["Status"] : ["Producto(s)", "Status"]),
      isLead ? "Fecha creación lead" : "Fecha creación cliente",
    ],
    [isAdmin, isLead],
  );

  const selectOptions = useMemo(
    () => ["ALL", ...Object.keys(statusOptions)],
    [statusOptions],
  );

  const selectLabels = useMemo(
    () => ["Todos", ...Object.values(statusOptions)],
    [statusOptions],
  );

  // Registra callback de recarga cuando se crea un lead
  useEffect(() => {
    if (isLead) {
      setOnLeadCreated(() => () => { void mutate(); });
      return () => setOnLeadCreated(null);
    }
  }, [isLead, mutate, setOnLeadCreated]);

  if (isLoading && leads.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isLead ? "Leads" : "Clientes"}
        description={`${total} ${label.toLowerCase()}${total !== 1 ? "s" : ""}`}
        action={
          isLead && canCreateLead(session?.user?.role ?? "")
            ? {
                label: `Nuevo ${label}`,
                icon: Plus,
                onClick: () => setLeadsModalOpen(true),
              }
            : undefined
        }
      />

      {/* Filtros: el buscador ocupa el espacio libre y el resto pasa a otra línea si no cabe */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 flex-1 min-w-64">
          <label htmlFor="filterSearch" className={FILTER_LABEL}>
            Buscar
          </label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <Search size={16} className="text-on-surface-variant shrink-0" />
            <input
              id="filterSearch"
              type="text"
              placeholder="Nombre, teléfono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-lg text-white/70 placeholder:text-white/50 outline-none w-full"
            />
          </div>
        </div>

          <div className="space-y-1">
            <span className={FILTER_LABEL}>Status</span>
            <CustomSelect
              name="filterStatus"
              aria-label="Status"
              value={filterStatus === "ALL" ? "Todos" : (statusOptions[filterStatus] ?? "Todos")}
              onChange={(val) => {
                updateParams({ status: val });
              }}
              options={selectOptions}
              labels={selectLabels}
            />
          </div>
          {canFilterAgent && (
            <div className="space-y-1">
              <span className={FILTER_LABEL}>Agente</span>
              <CustomSelect
                name="filterAgent"
                aria-label="Agente"
                searchable
                value={agents.find((a) => String(a.id) === filterAgent)?.name ?? "Todos"}
                onChange={(val) => {
                  updateParams({ agent: val });
                }}
                options={["", ...agents.map((a) => String(a.id))]}
                labels={[
                  "Todos",
                  ...agents.map((a) => (isGlobalRole(session?.user?.role ?? "") && a.company ? `${a.name} · ${a.company.name}` : a.name)),
                ]}
              />
            </div>
          )}
          <div className="space-y-1">
            <span className={FILTER_LABEL}>Producto</span>
            <CustomSelect
              name="filterProduct"
              aria-label="Producto"
              value={catalog.find((c) => String(c.id) === filterProduct)?.name ?? "Todos"}
              onChange={(val) => {
                updateParams({ product: val });
              }}
              options={["", ...catalog.map((c) => String(c.id))]}
              labels={["Todos", ...catalog.map((c) => c.name)]}
            />
          </div>
          {/* Fecha que muestra la tabla: creación del lead o conversión a cliente */}
          <div className="space-y-1">
            <label htmlFor="filterDateFrom" className={FILTER_LABEL}>
              {isLead ? "Creado desde" : "Cliente desde"}
            </label>
            <input
              id="filterDateFrom"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                updateParams({ from: e.target.value });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white/90 outline-none focus:border-tertiary/50"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="filterDateTo" className={FILTER_LABEL}>
              {isLead ? "Creado hasta" : "Cliente hasta"}
            </label>
            <input
              id="filterDateTo"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                updateParams({ to: e.target.value });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white/90 outline-none focus:border-tertiary/50"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-lg text-on-surface-variant hover:text-white transition-colors"
            >
              <X size={16} />
              Limpiar filtros
            </button>
          )}
      </div>

      {/* Tabla desktop */}
      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-sm text-on-surface-variant font-medium uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={(e) => openRow(e, `${basePath}/${lead.id}`)}
                  onAuxClick={(e) => openRow(e, `${basePath}/${lead.id}`)}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-lg text-white/90">
                    {lead.id}
                  </td>
                  <td className="px-4 py-3 text-lg text-white font-medium">
                    <Link
                      href={`${basePath}/${lead.id}`}
                      className="rounded outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-tertiary/60"
                    >
                      {lead.firstName} {lead.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/70 whitespace-nowrap">
                    {lead.phone1}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-lg text-white/90">
                      {lead.company?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-lg text-white/90">
                    {lead.assignedTo?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90 whitespace-nowrap">
                    {lead.assignedTo?.team?.name ?? "—"}
                  </td>

                  {isLead ? (
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm px-2 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[lead.status]}`}
                      >
                        {STATUS[lead.status]}
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {lead.products && lead.products.length > 0 ? (
                            lead.products.map((p) => (
                              <span
                                key={p.id}
                                className={`text-sm px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${productColorClass(p.catalog.color)}`}
                              >
                                {p.catalog.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-white/20 text-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lead.customerStatus ? (
                          <span
                            className={`text-sm px-2 py-1 rounded-full font-medium whitespace-nowrap ${CUSTOMER_STATUS_COLORS[lead.customerStatus]}`}
                          >
                            {CUSTOMER_STATUS[lead.customerStatus]}
                          </span>
                        ) : (
                          <span className="text-white/20 text-sm">—</span>
                        )}
                      </td>
                    </>
                  )}

                  <td className="px-4 py-3 text-sm text-white/90">
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
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`${basePath}/${lead.id}`}
              className="block p-4 space-y-2 hover:bg-white/5 transition-colors outline-none focus-visible:bg-white/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-medium text-lg">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    #{lead.id} · {lead.phone1}
                  </p>
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
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
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
                      {p.catalog.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {leads.length === 0 && !isLoading && (
          <div className="text-center py-12 text-white/90 text-lg">
            No hay {label.toLowerCase()}s registrados
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-sm text-on-surface-variant">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="px-3 py-1 text-sm rounded border border-white/10 text-white/60 disabled:opacity-30 hover:bg-white/5 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="px-3 py-1 text-sm rounded border border-white/10 text-white/60 disabled:opacity-30 hover:bg-white/5 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
