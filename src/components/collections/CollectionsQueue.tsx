"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarCheck,
  DollarSign,
  RefreshCw,
  Search,
} from "lucide-react";
import { confirmToast } from "@/lib/confirmToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { fetcher } from "@/lib/fetcher";
import { formatAmount, formatDate, formatFullName, formatYmd } from "@/utils/helpers/format";
import { postAction } from "@/lib/postAction";
import { productColorClass } from "@/utils/constants/products";
import {
  canCharge,
  chargeDateFor,
  CollectionView,
} from "@/lib/collections";
import { startOfToday, todayYmd, ymdOf } from "@/lib/businessDays";
import {
  ActionTarget,
  ChargeModal,
} from "@/components/collections/CollectionActionModals";
import { CollectionDatePicker } from "@/components/collections/CollectionDatePicker";

const LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

const TABS: { view: CollectionView; label: string; empty: string; countStyle: string }[] = [
  {
    view: "transfer",
    label: "Transfer",
    empty: "No hay pagos confirmados para esta fecha",
    countStyle: "bg-warning/10 text-warning",
  },
  {
    view: "approved",
    label: "Aprobados",
    empty: "No hay pagos aprobados en esta fecha",
    countStyle: "bg-success/10 text-success",
  },
  {
    view: "processing",
    label: "Proceso",
    empty: "No hay débitos en proceso",
    countStyle: "bg-tertiary/10 text-tertiary",
  },
  {
    view: "fallen",
    label: "Caída",
    empty: "No hay pagos suspendidos ni devueltos",
    countStyle: "bg-error/10 text-error",
  },
];

const TAB_ACTIVE = "border-tertiary/50 bg-tertiary/10 text-tertiary";
const TAB_IDLE = "border-white/10 bg-white/5 text-on-surface-variant hover:text-white/60";

const ACTION_BUTTON =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-sm text-on-surface-variant transition-colors disabled:opacity-50";

interface QueueItem {
  id: number;
  number: number;
  date: string;
  amount: number;
  status: string;
  paidAt: string | null;
  confirmedAt: string | null;
  confirmedBy: { name: string } | null;
  suspendedAt: string | null;
  suspendReason: string | null;
  lastAttempt: {
    id: number;
    status: string;
    rawStatus: string | null;
    failureCode: string | null;
    failureReason: string | null;
    scheduledFor: string | null;
    createdAt: string;
    voidable: boolean;
    unconfirmed: boolean;
    memo: string;
  } | null;
  product: { id: number; name: string; color: string };
  lead: {
    id: number;
    type: "lead" | "customer";
    firstName: string;
    lastName: string | null;
    company: { name: string } | null;
    assignedTo: { name: string } | null;
  };
  paymentMethod: { type: "CUENTA" | "TARJETA"; last4: string | null; bank: string | null } | null;
}

interface QueueResponse {
  data: QueueItem[];
  total: number;
  totalPages: number;
  /** Fecha mostrada en Transfer (ventana de cobro) o Aprobados (fecha de pago). */
  date: string | null;
  window: { date: string; count: number }[];
  counts: Record<CollectionView, number>;
}

function daysLate(date: string) {
  return Math.round((startOfToday().getTime() - new Date(date).getTime()) / DAY_MS);
}

export function CollectionsQueue() {
  const router = useRouter();
  const [view, setView] = useState<CollectionView>("transfer");
  // Fecha elegida por pestaña; sin elegir, el backend usa la primera de la
  // ventana (Transfer) o hoy (Aprobados).
  const [dates, setDates] = useState<Partial<Record<CollectionView, string>>>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [page, setPage] = useState(1);
  const [charging, setCharging] = useState<ActionTarget | null>(null);
  const [busyAttempt, setBusyAttempt] = useState<number | null>(null);

  // Debounce búsqueda: el setState ocurre en el callback del timer, no directo en el efecto
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queueKey = useMemo(() => {
    const params = new URLSearchParams({ view, page: String(page), limit: String(LIMIT) });
    if (dates[view]) params.set("date", dates[view]);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (companyId) params.set("companyId", companyId);
    if (agentId) params.set("agentId", agentId);
    return `/api/collections?${params}`;
  }, [view, dates, page, debouncedSearch, companyId, agentId]);

  const { data, isLoading, mutate } = useSWR<QueueResponse>(queueKey, fetcher, {
    keepPreviousData: true,
  });
  const { data: companies = [] } = useSWR<{ id: number; name: string }[]>(
    "/api/companies?simple=true",
    fetcher,
  );
  // Agentes de la franquicia elegida (o de todas).
  const { data: agents = [] } = useSWR<{ id: number; name: string; company: { name: string } | null }[]>(
    `/api/users/agents${companyId ? `?companyId=${companyId}` : ""}`,
    fetcher,
  );

  const items = data?.data ?? [];
  const tab = TABS.find((t) => t.view === view)!;
  const shownDate = data?.date ?? dates[view] ?? null;
  // Suspender y reprogramar se hacen desde el plan de pagos del cliente.
  const hasActions = view === "transfer" || view === "processing";

  function selectDate(ymd: string) {
    setDates((prev) => ({ ...prev, [view]: ymd }));
    setPage(1);
  }

  function toTarget(item: QueueItem): ActionTarget {
    return {
      id: item.id,
      number: item.number,
      date: item.date,
      amount: item.amount,
      customerName: formatFullName(item.lead),
      accountLabel:
        item.paymentMethod?.type === "CUENTA"
          ? `cuenta ···· ${item.paymentMethod.last4 ?? "—"}${item.paymentMethod.bank ? ` (${item.paymentMethod.bank})` : ""}`
          : undefined,
      chargeDate: chargeDateFor(item.date),
    };
  }

  async function attemptAction(attemptId: number, kind: "refresh" | "void", success: string) {
    setBusyAttempt(attemptId);
    const ok = await postAction(`/api/charge-attempts/${attemptId}/${kind}`, undefined, { success });
    setBusyAttempt(null);
    if (ok) void mutate();
  }

  function handleVoid(item: QueueItem) {
    const attempt = item.lastAttempt;
    if (!attempt) return;
    if (attempt.unconfirmed) {
      confirmToast(
        `¿Confirmas que en SOAR no existe un débito con el memo ${attempt.memo}? El pago volverá a quedar pendiente y habrá que confirmarlo de nuevo.`,
        () => attemptAction(attempt.id, "void", "Débito descartado"),
        "Descartar",
      );
      return;
    }
    confirmToast(
      `¿Anular el débito de $ ${formatAmount(item.amount)} de ${formatFullName(item.lead)}? El pago volverá a quedar pendiente y habrá que confirmarlo de nuevo.`,
      () => attemptAction(attempt.id, "void", "Débito anulado"),
      "Anular",
    );
  }

  function openLead(item: QueueItem) {
    router.push(`/${item.lead.type === "customer" ? "customers" : "leads"}/${item.lead.id}`);
  }

  function handleDone() {
    setCharging(null);
    void mutate();
  }

  function renderActions(item: QueueItem) {
    const attempt = item.lastAttempt;
    const chargeable = canCharge(item) && item.paymentMethod?.type === "CUENTA";
    const scheduled = chargeDateFor(item.date) > todayYmd();

    return (
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {chargeable && (
          <button
            type="button"
            onClick={() => setCharging(toTarget(item))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-action hover:bg-action-hover text-on-action text-sm font-medium transition-colors"
          >
            {scheduled ? <CalendarCheck size={14} /> : <DollarSign size={14} />}
            {scheduled ? "Programar" : "Cobrar"}
          </button>
        )}
        {item.status === "PROCESSING" && attempt && (
          <>
            <button
              type="button"
              disabled={busyAttempt === attempt.id}
              onClick={() => attemptAction(attempt.id, "refresh", "Estado actualizado")}
              className={`${ACTION_BUTTON} hover:text-tertiary hover:border-tertiary/30`}
            >
              <RefreshCw size={14} className={busyAttempt === attempt.id ? "animate-spin" : ""} />
              Actualizar estado
            </button>
            {(attempt.voidable || attempt.unconfirmed) && (
              <button
                type="button"
                disabled={busyAttempt === attempt.id}
                onClick={() => handleVoid(item)}
                className={`${ACTION_BUTTON} hover:text-error hover:border-error/30`}
              >
                <Ban size={14} />
                {attempt.unconfirmed ? "Descartar" : "Anular"}
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  /** Motivo de la caída: código y explicación de la devolución, o motivo de la suspensión. */
  function renderReason(item: QueueItem) {
    const attempt = item.lastAttempt;
    if (item.status === "SUSPENDED")
      return (
        <>
          <p className="text-attention text-sm font-medium">Suspendido</p>
          <p className="text-white/90 line-clamp-2">{item.suspendReason ?? "—"}</p>
        </>
      );
    return (
      <>
        <p className="text-error text-sm font-medium">
          Devuelto{attempt?.failureCode ? ` · ${attempt.failureCode}` : ""}
        </p>
        <p className="text-white/90 line-clamp-2">{attempt?.failureReason ?? "—"}</p>
      </>
    );
  }

  /** Línea de detalle bajo la fecha, según la pestaña. */
  function renderDetail(item: QueueItem, forMobile = false) {
    const attempt = item.lastAttempt;
    if (view === "transfer") {
      const late = daysLate(item.date);
      return (
        <>
          {late > 0 && (
            <p className="text-sm text-error">
              {late} día{late !== 1 ? "s" : ""} de atraso
            </p>
          )}
          {item.confirmedAt && (
            <p className="text-sm text-on-surface-variant">
              Pago confirmado {formatDate(item.confirmedAt)}
              {item.confirmedBy && ` · ${item.confirmedBy.name}`}
            </p>
          )}
        </>
      );
    }
    if (view === "approved" && item.paidAt)
      return <p className="text-sm text-success">Pagada {formatDate(item.paidAt)}</p>;
    if (view === "processing" && attempt) {
      if (attempt.unconfirmed)
        return (
          <p className="text-sm text-attention">
            Sin confirmar · buscar en SOAR el memo {attempt.memo}
          </p>
        );
      if (attempt.scheduledFor && ymdOf(new Date(attempt.scheduledFor)) > todayYmd())
        return (
          <p className="text-sm text-tertiary">
            Programado para el {formatYmd(ymdOf(new Date(attempt.scheduledFor)))}
          </p>
        );
      return (
        <p className="text-sm text-on-surface-variant">
          Enviado {formatDate(attempt.createdAt)} · SOAR: {attempt.rawStatus ?? "—"}
        </p>
      );
    }
    if (view === "fallen" && !forMobile) return null;
    if (view === "fallen") {
      if (item.status === "SUSPENDED")
        return (
          <p className="text-sm text-attention">
            Suspendida{item.suspendReason ? `: ${item.suspendReason}` : ""}
          </p>
        );
      return (
        <p className="text-sm text-error">
          Devuelta
          {attempt?.failureCode ? ` · ${attempt.failureCode}` : ""}
          {attempt?.failureReason ? ` · ${attempt.failureReason}` : ""}
        </p>
      );
    }
    return null;
  }

  if (isLoading && !data) return <Loading />;

  return (
    <div className="w-full mx-auto px-4 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader title="Cobros" description="Pagos confirmados de todas las franquicias" />

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.view}
            type="button"
            onClick={() => {
              setView(t.view);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-lg font-medium transition-all ${view === t.view ? TAB_ACTIVE : TAB_IDLE}`}
          >
            {t.label}
            <span className={`text-sm px-2 py-0.5 rounded-full ${t.countStyle}`}>
              {data?.counts[t.view] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {view === "transfer" && (
          <CollectionDatePicker value={shownDate} onChange={selectDate} window={data?.window ?? []} />
        )}
        {view === "approved" && (
          <CollectionDatePicker value={shownDate} onChange={selectDate} count={data?.total} />
        )}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
          <Search size={16} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono o ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-lg text-white/70 placeholder:text-white/90 outline-none w-full"
          />
        </div>
        <CustomSelect
          name="filterCompany"
          aria-label="Filtrar por franquicia"
          value={companies.find((c) => String(c.id) === companyId)?.name ?? "Todas las franquicias"}
          onChange={(val) => {
            setCompanyId(val);
            setAgentId("");
            setPage(1);
          }}
          options={["", ...companies.map((c) => String(c.id))]}
          labels={["Todas las franquicias", ...companies.map((c) => c.name)]}
        />
        <CustomSelect
          name="filterAgent"
          aria-label="Filtrar por agente"
          searchable
          value={agents.find((a) => String(a.id) === agentId)?.name ?? "Todos los agentes"}
          onChange={(val) => {
            setAgentId(val);
            setPage(1);
          }}
          options={["", ...agents.map((a) => String(a.id))]}
          labels={[
            "Todos los agentes",
            ...agents.map((a) => (companyId || !a.company ? a.name : `${a.name} · ${a.company.name}`)),
          ]}
        />
      </div>

      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        {/* Tabla desktop */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  "Cliente",
                  "Franquicia",
                  "Producto",
                  "Fecha",
                  "Monto",
                  ...(view === "fallen" ? ["Motivo"] : []),
                  ...(hasActions ? ["Acciones"] : []),
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
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openLead(item)}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="text-lg text-white font-medium">{formatFullName(item.lead)}</p>
                    <p className="text-sm text-on-surface-variant">
                      #{item.lead.id}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90">
                    <p>{item.lead.company?.name ?? "—"}</p>
                    {item.lead.assignedTo && (
                      <p className="text-sm text-on-surface-variant">{item.lead.assignedTo.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${productColorClass(item.product.color)}`}
                    >
                      {item.product.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90">
                    <p className="whitespace-nowrap">{formatDate(item.date)}</p>
                    {renderDetail(item)}
                  </td>
                  <td className="px-4 py-3 text-lg text-white font-medium whitespace-nowrap">
                    $ {formatAmount(item.amount)}
                  </td>
                  {view === "fallen" && (
                    <td className="px-4 py-3 text-lg max-w-xs">{renderReason(item)}</td>
                  )}
                  {hasActions && <td className="px-4 py-3">{renderActions(item)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tarjetas móvil */}
        <div className="md:hidden divide-y divide-white/5">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => openLead(item)}
              className="p-4 space-y-2 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-medium text-lg truncate">{formatFullName(item.lead)}</p>
                  <p className="text-on-surface-variant text-sm">
                    #{item.lead.id}
                  </p>
                </div>
                <span className="text-white font-medium text-lg shrink-0">
                  $ {formatAmount(item.amount)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                <span>{item.product.name}</span>
                <span>{formatDate(item.date)}</span>
                {item.lead.company?.name && <span>{item.lead.company.name}</span>}
                {item.lead.assignedTo && <span>Asesor: {item.lead.assignedTo.name}</span>}
              </div>
              {renderDetail(item, true)}
              {hasActions && renderActions(item)}
            </div>
          ))}
        </div>

        {items.length === 0 && !isLoading && (
          <div className="text-center py-12 text-white/90 text-lg">{tab.empty}</div>
        )}

        {/* Paginación */}
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

      {charging && (
        <ChargeModal target={charging} onClose={() => setCharging(null)} onDone={handleDone} />
      )}
    </div>
  );
}
