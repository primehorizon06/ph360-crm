"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomSelect } from "@/components/ui/Select";
import { fetcher } from "@/lib/fetcher";
import { formatAmount, formatDate, formatFullName } from "@/utils/helpers/format";
import { productColorClass } from "@/utils/constants/products";
import { PaymentCards } from "@/components/dashboard/PaymentCards";
import {
  GROUP_STYLES,
  PaymentGroup,
  PaymentsSummary,
  quincenaLabel,
} from "@/components/dashboard/paymentGroups";

const LIMIT = 20;
const FILTER_LABEL = "block text-sm text-on-surface-variant";

interface PaymentRow {
  id: number;
  date: string;
  amount: number;
  status: string;
  paidAt: string | null;
  suspendReason: string | null;
  failureCode: string | null;
  failureReason: string | null;
  product: { name: string; color: string };
  lead: {
    id: number;
    type: "lead" | "customer";
    firstName: string;
    lastName: string | null;
    company: { name: string } | null;
    assignedTo: { name: string } | null;
  };
}

interface PaymentsResponse {
  summary: PaymentsSummary;
  data: PaymentRow[];
  total: number;
  totalPages: number;
}

interface Props {
  initialGroup: PaymentGroup;
  year: number;
  month: number;
  quincena: 1 | 2;
  /** Franquicia con la que se abrió (filtro del dashboard). */
  initialCompanyId?: string;
}

/**
 * Detalle de los pagos de la quincena (admin y Customer Service Holding): los
 * cards de los cuatro grupos para cambiar de grupo, filtros de franquicia,
 * asesor y producto (aplican a los cards y a la tabla) y la tabla del grupo.
 */
export function PaymentsReport({ initialGroup, year, month, quincena, initialCompanyId }: Props) {
  const router = useRouter();
  const [group, setGroup] = useState<PaymentGroup>(initialGroup);
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [agentId, setAgentId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [page, setPage] = useState(1);

  const key = useMemo(() => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      quincena: String(quincena),
      group,
      page: String(page),
      limit: String(LIMIT),
    });
    if (companyId) params.set("companyId", companyId);
    if (agentId) params.set("agentId", agentId);
    if (catalogId) params.set("catalogId", catalogId);
    return `/api/dashboard/payments?${params}`;
  }, [year, month, quincena, group, page, companyId, agentId, catalogId]);

  const { data, isLoading } = useSWR<PaymentsResponse>(key, fetcher, { keepPreviousData: true });
  const { data: companies = [] } = useSWR<{ id: number; name: string }[]>(
    "/api/companies?simple=true",
    fetcher,
  );
  const { data: agents = [] } = useSWR<{ id: number; name: string; company: { name: string } | null }[]>(
    `/api/users/agents${companyId ? `?companyId=${companyId}` : ""}`,
    fetcher,
  );
  const { data: catalog = [] } = useSWR<{ id: number; name: string }[]>("/api/product-catalog", fetcher);

  const style = GROUP_STYLES[group];
  const rows = data?.data ?? [];

  function selectGroup(next: PaymentGroup) {
    setGroup(next);
    setPage(1);
    // Mantiene la URL al día para poder compartirla o recargarla.
    router.replace(`/payments?group=${next}&year=${year}&month=${month}&quincena=${quincena}`, {
      scroll: false,
    });
  }

  function changeFilter(set: (v: string) => void) {
    return (value: string) => {
      set(value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al dashboard
        </Link>
        <h1 className="text-2xl font-bold text-on-surface">Pagos</h1>
        <p className="text-lg text-on-surface-variant">
          {quincenaLabel(year, month, quincena)}
        </p>
      </div>

      <PaymentCards summary={data?.summary} active={group} onSelect={selectGroup} />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className={FILTER_LABEL}>Franquicia</span>
          <CustomSelect
            name="paymentsCompany"
            aria-label="Franquicia"
            value={companies.find((c) => String(c.id) === companyId)?.name ?? "Todas"}
            onChange={(val) => {
              changeFilter(setCompanyId)(val);
              setAgentId("");
            }}
            options={["", ...companies.map((c) => String(c.id))]}
            labels={["Todas", ...companies.map((c) => c.name)]}
          />
        </div>
        <div className="space-y-1">
          <span className={FILTER_LABEL}>Asesor</span>
          <CustomSelect
            name="paymentsAgent"
            aria-label="Asesor"
            searchable
            value={agents.find((a) => String(a.id) === agentId)?.name ?? "Todos"}
            onChange={changeFilter(setAgentId)}
            options={["", ...agents.map((a) => String(a.id))]}
            labels={[
              "Todos",
              ...agents.map((a) => (companyId || !a.company ? a.name : `${a.name} · ${a.company.name}`)),
            ]}
          />
        </div>
        <div className="space-y-1">
          <span className={FILTER_LABEL}>Producto</span>
          <CustomSelect
            name="paymentsProduct"
            aria-label="Producto"
            value={catalog.find((c) => String(c.id) === catalogId)?.name ?? "Todos"}
            onChange={changeFilter(setCatalogId)}
            options={["", ...catalog.map((c) => String(c.id))]}
            labels={["Todos", ...catalog.map((c) => c.name)]}
          />
        </div>
      </div>

      {/* Tabla del grupo elegido */}
      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <p className={`font-medium ${style.accent}`}>{style.title}</p>
          <p className="text-sm text-on-surface-variant">
            {data?.total ?? 0} pago{data?.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Cliente",
                  "Franquicia",
                  "Producto",
                  group === "approved" ? "Fecha de pago" : "Fecha",
                  "Monto",
                  ...(group === "fallen" ? ["Motivo"] : []),
                ].map((h) => (
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
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() =>
                    router.push(`/${row.lead.type === "customer" ? "customers" : "leads"}/${row.lead.id}`)
                  }
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="text-lg text-white font-medium">{formatFullName(row.lead)}</p>
                    <p className="text-sm text-on-surface-variant">#{row.lead.id}</p>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90">
                    <p>{row.lead.company?.name ?? "—"}</p>
                    {row.lead.assignedTo && (
                      <p className="text-sm text-on-surface-variant">{row.lead.assignedTo.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${productColorClass(row.product.color)}`}
                    >
                      {row.product.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90 whitespace-nowrap">
                    {formatDate(group === "approved" && row.paidAt ? row.paidAt : row.date)}
                  </td>
                  <td className="px-4 py-3 text-lg text-white font-medium whitespace-nowrap">
                    $ {formatAmount(row.amount)}
                  </td>
                  {group === "fallen" && (
                    <td className="px-4 py-3 text-lg max-w-xs">
                      {row.status === "SUSPENDED" ? (
                        <>
                          <p className="text-attention text-sm font-medium">Suspendido</p>
                          <p className="text-white/90 line-clamp-2">{row.suspendReason ?? "—"}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-error text-sm font-medium">
                            Devuelto{row.failureCode ? ` · ${row.failureCode}` : ""}
                          </p>
                          <p className="text-white/90 line-clamp-2">{row.failureReason ?? "—"}</p>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && !isLoading && (
          <div className="text-center py-10 text-white/90 text-lg">{style.empty}</div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-sm text-on-surface-variant">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} de {data.total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm rounded border border-white/10 text-white/60 disabled:opacity-30 hover:bg-white/5 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
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
