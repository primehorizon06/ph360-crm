"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRowNavigation, useUrlFilters } from "@/hooks/useUrlFilters";
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  DollarSign,
  Inbox,
  RefreshCw,
  Search,
} from "lucide-react";
import { confirmToast } from "@/lib/confirmToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { DEFAULT_PAGE_SIZE, Pagination } from "@/components/ui/Pagination";
import { fetcher } from "@/lib/fetcher";
import { formatAmount, formatFullName, formatShortDate, formatYmd } from "@/utils/helpers/format";
import { postAction } from "@/lib/postAction";
import { productColorClass } from "@/utils/constants/products";
import {
  canCharge,
  chargeDateFor,
  CollectionView,
} from "@/lib/collections";
import { startOfToday, todayYmd, ymdOf } from "@/lib/businessDays";
import { inputDateToDate } from "@/utils/helpers/dateInput";
import {
  ActionTarget,
  ChargeModal,
} from "@/components/collections/CollectionActionModals";
import { CollectionDatePicker } from "@/components/collections/CollectionDatePicker";

const DAY_MS = 24 * 60 * 60 * 1000;

const TABS: {
  view: CollectionView;
  label: string;
  description: string;
  empty: string;
  countStyle: string;
}[] = [
  {
    view: "transfer",
    label: "Transfer",
    description: "Pagos confirmados de todas las franquicias, listos para cobrar",
    empty: "No hay pagos confirmados para esta fecha",
    countStyle: "bg-warning/10 text-warning",
  },
  {
    view: "approved",
    label: "Aprobados",
    description: "Pagos aprobados en la fecha elegida",
    empty: "No hay pagos aprobados en esta fecha",
    countStyle: "bg-success/10 text-success",
  },
  {
    view: "scheduled",
    label: "Programado",
    description: "Débitos programados en SOAR para una fecha futura",
    empty: "No hay débitos programados",
    countStyle: "bg-secondary/10 text-secondary",
  },
  {
    view: "processing",
    label: "SOAR Processed",
    description: "Débitos enviados a SOAR a la espera de su resultado",
    empty: "No hay débitos procesados por SOAR",
    countStyle: "bg-tertiary/10 text-tertiary",
  },
  {
    view: "fallen",
    label: "Caída",
    description: "Pagos suspendidos o devueltos por el banco",
    empty: "No hay pagos suspendidos ni devueltos",
    countStyle: "bg-error/10 text-error",
  },
];

const COUNT_IDLE = "bg-surface-container-high text-on-surface-variant";

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
  const {
    searchParams,
    updateParams,
    query: debouncedSearch,
    search,
    setSearch,
    page,
    pageSize,
  } = useUrlFilters();
  const openRowHref = useRowNavigation();
  const viewParam = searchParams.get("view");
  const view: CollectionView = TABS.some((t) => t.view === viewParam)
    ? (viewParam as CollectionView)
    : "transfer";
  // Sin fecha elegida, el backend usa la primera de la ventana (Transfer) o hoy (Aprobados).
  const selectedDate = searchParams.get("date") ?? "";
  const companyId = searchParams.get("company") ?? "";
  const agentId = searchParams.get("agent") ?? "";
  const [charging, setCharging] = useState<ActionTarget | null>(null);
  const [busyAttempt, setBusyAttempt] = useState<number | null>(null);

  const queueKey = useMemo(() => {
    const params = new URLSearchParams({ view, page: String(page), limit: String(pageSize) });
    if (selectedDate) params.set("date", selectedDate);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (companyId) params.set("companyId", companyId);
    if (agentId) params.set("agentId", agentId);
    return `/api/collections?${params}`;
  }, [view, selectedDate, page, pageSize, debouncedSearch, companyId, agentId]);

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
  const shownDate = data?.date ?? (selectedDate || null);
  // Suspender y reprogramar se hacen desde el plan de pagos del cliente.
  const hasActions = view === "transfer" || view === "scheduled" || view === "processing";
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const nextDate = useMemo(() => {
    if (view !== "transfer") return null;
    const withPayments = (data?.window ?? []).filter((d) => d.count > 0 && d.date !== shownDate);
    return (
      withPayments.find((d) => !shownDate || d.date > shownDate)?.date ??
      withPayments[0]?.date ??
      null
    );
  }, [view, data?.window, shownDate]);

  function selectDate(ymd: string) {
    updateParams({ date: ymd });
  }

  function selectView(next: CollectionView) {
    updateParams({ view: next === "transfer" ? "" : next, date: "" });
  }

  function leadHref(item: QueueItem) {
    return `/${item.lead.type === "customer" ? "customers" : "leads"}/${item.lead.id}`;
  }

  function openRow(e: React.MouseEvent, item: QueueItem) {
    openRowHref(e, leadHref(item));
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
              Confirmado {formatShortDate(item.confirmedAt)}
              {item.confirmedBy && ` · ${item.confirmedBy.name}`}
            </p>
          )}
        </>
      );
    }
    if (view === "approved" && item.paidAt)
      return <p className="text-sm text-success">Pagada {formatShortDate(item.paidAt)}</p>;
    if ((view === "scheduled" || view === "processing") && attempt) {
      if (attempt.unconfirmed)
        return (
          <p className="flex items-center gap-1.5 text-sm text-warning">
            <AlertTriangle size={14} aria-hidden="true" className="shrink-0" />
            Sin confirmar · buscar en SOAR el memo {attempt.memo}
          </p>
        );
      const scheduledYmd = attempt.scheduledFor ? ymdOf(new Date(attempt.scheduledFor)) : null;
      if (scheduledYmd && scheduledYmd > todayYmd())
        return (
          <p className="text-sm text-tertiary">
            Programado para el {formatShortDate(inputDateToDate(scheduledYmd))}
          </p>
        );
      return (
        <p className="text-sm text-on-surface-variant">
          Enviado {formatShortDate(attempt.createdAt)} · SOAR: {attempt.rawStatus ?? "—"}
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

  if (isLoading && !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Cobros" description={tab.description} />

      {/* Pestañas */}
      <div
        role="tablist"
        aria-label="Estado de los cobros"
        className="border-b border-white/10 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            const count = data?.counts[t.view] ?? 0;
            const active = view === t.view;
            return (
              <button
                key={t.view}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectView(t.view)}
                className={`flex items-center gap-2 px-4 py-2.5 text-lg font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-tertiary text-tertiary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {t.label}
                <span
                  className={`text-sm px-2 py-0.5 rounded-full tabular-nums ${count > 0 ? t.countStyle : COUNT_IDLE}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {view === "transfer" && (
          <CollectionDatePicker value={shownDate} onChange={selectDate} window={data?.window ?? []} />
        )}
        {view === "approved" && (
          <CollectionDatePicker value={shownDate} onChange={selectDate} />
        )}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1 focus-within:border-tertiary/50 transition-colors">
          <Search size={16} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            aria-label="Buscar cobros"
            placeholder="Buscar por cliente, teléfono o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-lg text-on-surface placeholder:text-on-surface-variant outline-none w-full"
          />
        </div>
        <CustomSelect
          name="filterCompany"
          aria-label="Filtrar por franquicia"
          value={companies.find((c) => String(c.id) === companyId)?.name ?? "Todas las franquicias"}
          onChange={(val) => updateParams({ company: val, agent: "" })}
          options={["", ...companies.map((c) => String(c.id))]}
          labels={["Todas las franquicias", ...companies.map((c) => c.name)]}
        />
        <CustomSelect
          name="filterAgent"
          aria-label="Filtrar por agente"
          searchable
          value={agents.find((a) => String(a.id) === agentId)?.name ?? "Todos los agentes"}
          onChange={(val) => updateParams({ agent: val })}
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
                    className={`${h === "Monto" ? "text-right" : "text-left"} px-4 py-3 text-sm text-on-surface-variant font-medium uppercase tracking-wider`}
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
                  onClick={(e) => openRow(e, item)}
                  onAuxClick={(e) => openRow(e, item)}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Link
                      href={leadHref(item)}
                      className="text-lg text-white font-medium rounded outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-tertiary/60"
                    >
                      {formatFullName(item.lead)}
                    </Link>
                    <p className="text-sm text-on-surface-variant">
                      #{item.lead.id}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-lg text-white/90 max-w-[16rem]">
                    <p className="truncate" title={item.lead.company?.name}>
                      {item.lead.company?.name ?? "—"}
                    </p>
                    {item.lead.assignedTo && (
                      <p className="text-sm text-on-surface-variant truncate">{item.lead.assignedTo.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${productColorClass(item.product.color)}`}
                    >
                      {item.product.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-lg text-white/90 whitespace-nowrap">
                    <p>{formatShortDate(item.date)}</p>
                    {renderDetail(item)}
                  </td>
                  <td className="px-4 py-2.5 text-lg text-white font-medium whitespace-nowrap text-right tabular-nums">
                    $ {formatAmount(item.amount)}
                  </td>
                  {view === "fallen" && (
                    <td className="px-4 py-2.5 text-lg max-w-xs">{renderReason(item)}</td>
                  )}
                  {hasActions && <td className="px-4 py-2.5">{renderActions(item)}</td>}
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
              onClick={(e) => openRow(e, item)}
              className="p-4 space-y-2 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={leadHref(item)}
                    className="block text-white font-medium text-lg truncate outline-none focus-visible:underline"
                  >
                    {formatFullName(item.lead)}
                  </Link>
                  <p className="text-on-surface-variant text-sm">
                    #{item.lead.id}
                  </p>
                </div>
                <span className="text-white font-medium text-lg shrink-0 tabular-nums">
                  $ {formatAmount(item.amount)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                <span>{item.product.name}</span>
                <span>{formatShortDate(item.date)}</span>
                {item.lead.company?.name && <span>{item.lead.company.name}</span>}
                {item.lead.assignedTo && <span>Asesor: {item.lead.assignedTo.name}</span>}
              </div>
              {renderDetail(item, true)}
              {hasActions && renderActions(item)}
            </div>
          ))}
        </div>

        {items.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <Inbox size={32} className="text-on-surface-variant" aria-hidden="true" />
            <p className="text-lg text-on-surface">{tab.empty}</p>
            {nextDate && (
              <button
                type="button"
                onClick={() => selectDate(nextDate)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tertiary/30 text-sm text-tertiary hover:bg-tertiary/10 transition-colors"
              >
                <CalendarCheck size={14} />
                Ir a la próxima fecha con pagos · {formatYmd(nextDate, "short")}
              </button>
            )}
          </div>
        )}

        {/* Paginación */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          itemLabel={{ singular: "cuota", plural: "cuotas" }}
          onPageChange={(p) => updateParams({ page: String(p) })}
          onPageSizeChange={(size) =>
            updateParams({ size: size === DEFAULT_PAGE_SIZE ? "" : String(size) })
          }
        />
      </div>

      {charging && (
        <ChargeModal target={charging} onClose={() => setCharging(null)} onDone={handleDone} />
      )}
    </div>
  );
}
