"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  Ban,
  Building2,
  CalendarClock,
  CreditCard,
  DollarSign,
  PauseCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { confirmToast } from "@/lib/confirmToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { fetcher } from "@/lib/fetcher";
import { formatAmount, formatDate, formatFullName } from "@/utils/helpers/format";
import { postAction } from "@/lib/postAction";
import { productColorClass } from "@/utils/constants/products";
import { canCharge, canReschedule, canSuspend, CollectionView, startOfToday } from "@/lib/collections";
import {
  ActionTarget,
  ChargeModal,
  RescheduleModal,
  SuspendModal,
} from "@/components/collections/CollectionActionModals";

const LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

const TABS: { view: CollectionView; label: string; empty: string }[] = [
  { view: "today", label: "Hoy", empty: "No hay cuotas para cobrar hoy" },
  { view: "overdue", label: "Atrasadas", empty: "No hay cuotas atrasadas" },
  { view: "suspended", label: "Suspendidas", empty: "No hay cuotas suspendidas" },
  { view: "processing", label: "En proceso", empty: "No hay débitos en proceso" },
  { view: "failed", label: "Devueltas", empty: "No hay cuotas devueltas" },
];

const TAB_COUNT_STYLES: Record<CollectionView, string> = {
  today: "bg-warning/10 text-warning",
  overdue: "bg-error/10 text-error",
  suspended: "bg-attention/10 text-attention",
  processing: "bg-tertiary/10 text-tertiary",
  failed: "bg-error/10 text-error",
};

const ACTION_BUTTON =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-sm text-on-surface-variant transition-colors disabled:opacity-50";

interface QueueItem {
  id: number;
  number: number;
  date: string;
  amount: number;
  status: string;
  suspendedAt: string | null;
  suspendReason: string | null;
  lastAttempt: {
    id: number;
    status: string;
    rawStatus: string | null;
    failureCode: string | null;
    failureReason: string | null;
    createdAt: string;
    voidable: boolean;
    unconfirmed: boolean;
    memo: string;
  } | null;
  totalInstallments: number;
  product: { id: number; name: string; color: string };
  lead: {
    id: number;
    type: "lead" | "customer";
    firstName: string;
    lastName: string | null;
    phone1: string;
    company: { name: string } | null;
  };
  paymentMethod: { type: "CUENTA" | "TARJETA"; last4: string | null; bank: string | null } | null;
}

interface QueueResponse {
  data: QueueItem[];
  total: number;
  totalPages: number;
  counts: Record<CollectionView, number>;
}

function daysLate(date: string) {
  return Math.round((startOfToday().getTime() - new Date(date).getTime()) / DAY_MS);
}

function PaymentMethodLabel({ method }: { method: QueueItem["paymentMethod"] }) {
  if (!method) return <span className="text-white/20">—</span>;
  const Icon = method.type === "CUENTA" ? Building2 : CreditCard;
  return (
    <span className="inline-flex items-center gap-1.5 text-white/90">
      <Icon size={14} className="text-on-surface-variant shrink-0" />
      {method.type === "CUENTA" ? "Cuenta" : "Tarjeta"} ···· {method.last4 ?? "—"}
      {method.bank && <span className="text-on-surface-variant">· {method.bank}</span>}
    </span>
  );
}

export function CollectionsQueue() {
  const router = useRouter();
  const [view, setView] = useState<CollectionView>("today");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{
    kind: "charge" | "suspend" | "reschedule";
    target: ActionTarget;
  } | null>(null);
  const [busyAttempt, setBusyAttempt] = useState<number | null>(null);

  // Debounce búsqueda: el setState ocurre en el callback del timer, no directo en el efecto
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queueKey = useMemo(() => {
    const params = new URLSearchParams({ view, page: String(page), limit: String(LIMIT) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (companyId) params.set("companyId", companyId);
    return `/api/collections?${params}`;
  }, [view, page, debouncedSearch, companyId]);

  const { data, isLoading, mutate } = useSWR<QueueResponse>(queueKey, fetcher, {
    keepPreviousData: true,
  });
  const { data: companies = [] } = useSWR<{ id: number; name: string }[]>(
    "/api/companies?simple=true",
    fetcher,
  );

  const items = data?.data ?? [];
  const activeTab = TABS.find((t) => t.view === view)!;

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
        `¿Confirmas que en SOAR no existe un débito con el memo ${attempt.memo}? La cuota volverá a quedar pendiente y se podrá cobrar de nuevo.`,
        () => attemptAction(attempt.id, "void", "Débito descartado"),
        "Descartar",
      );
      return;
    }
    confirmToast(
      `¿Anular el débito de $ ${formatAmount(item.amount)} de ${formatFullName(item.lead)}? La cuota volverá a quedar pendiente.`,
      () => attemptAction(attempt.id, "void", "Débito anulado"),
      "Anular",
    );
  }

  function openLead(item: QueueItem) {
    router.push(`/${item.lead.type === "customer" ? "customers" : "leads"}/${item.lead.id}`);
  }

  function handleDone() {
    setAction(null);
    void mutate();
  }

  function renderActions(item: QueueItem) {
    const attempt = item.lastAttempt;
    const chargeable = canCharge(item.status) && item.paymentMethod?.type === "CUENTA";

    return (
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {chargeable && (
          <button
            type="button"
            onClick={() => setAction({ kind: "charge", target: toTarget(item) })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-action hover:bg-action-hover text-on-action text-sm font-medium transition-colors"
          >
            <DollarSign size={14} />
            Cobrar
          </button>
        )}
        {canSuspend(item.status) && (
          <button
            type="button"
            onClick={() => setAction({ kind: "suspend", target: toTarget(item) })}
            className={`${ACTION_BUTTON} hover:text-attention hover:border-attention/30`}
          >
            <PauseCircle size={14} />
            Suspender
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
        {canReschedule(item.status) && (
          <button
            type="button"
            onClick={() => setAction({ kind: "reschedule", target: toTarget(item) })}
            className={`${ACTION_BUTTON} hover:text-tertiary hover:border-tertiary/30`}
          >
            <CalendarClock size={14} />
            Reprogramar
          </button>
        )}
      </div>
    );
  }

  function renderAttemptInfo(item: QueueItem) {
    const attempt = item.lastAttempt;
    if (!attempt) return null;
    if (view === "processing" && attempt.unconfirmed)
      return (
        <p className="text-sm text-attention">
          Sin confirmar · buscar en SOAR el memo {attempt.memo}
        </p>
      );
    if (view === "processing")
      return (
        <p className="text-sm text-on-surface-variant">
          Enviado {formatDate(attempt.createdAt)} · SOAR: {attempt.rawStatus ?? "—"}
        </p>
      );
    if (view === "failed")
      return (
        <p className="text-sm text-error">
          {attempt.failureCode ? `${attempt.failureCode} · ` : ""}
          {attempt.failureReason ?? "Devuelto"}
        </p>
      );
    return null;
  }

  if (isLoading && !data) return <Loading />;

  return (
    <div className="w-full mx-auto px-4 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Cobros"
        description="Cuotas por cobrar de todas las franquicias"
      />

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.view}
            type="button"
            onClick={() => {
              setView(tab.view);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-lg font-medium transition-all ${
              view === tab.view
                ? "border-tertiary/50 bg-tertiary/10 text-tertiary"
                : "border-white/10 bg-white/5 text-on-surface-variant hover:text-white/60"
            }`}
          >
            {tab.label}
            <span
              className={`text-sm px-2 py-0.5 rounded-full ${TAB_COUNT_STYLES[tab.view]}`}
            >
              {data?.counts[tab.view] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
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
            setPage(1);
          }}
          options={["", ...companies.map((c) => String(c.id))]}
          labels={["Todas las franquicias", ...companies.map((c) => c.name)]}
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
                  "Cuota",
                  "Fecha",
                  "Monto",
                  "Método de pago",
                  ...(view === "suspended" ? ["Motivo"] : []),
                  "Acciones",
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
                      #{item.lead.id} · {item.lead.phone1}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90">
                    {item.lead.company?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${productColorClass(item.product.color)}`}
                    >
                      {item.product.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90 whitespace-nowrap">
                    {item.number} de {item.totalInstallments}
                  </td>
                  <td className="px-4 py-3 text-lg text-white/90 whitespace-nowrap">
                    {formatDate(item.date)}
                    {view === "overdue" && (
                      <p className="text-sm text-error">
                        {daysLate(item.date)} día{daysLate(item.date) !== 1 ? "s" : ""} de atraso
                      </p>
                    )}
                    {renderAttemptInfo(item)}
                  </td>
                  <td className="px-4 py-3 text-lg text-white font-medium whitespace-nowrap">
                    $ {formatAmount(item.amount)}
                  </td>
                  <td className="px-4 py-3 text-lg">
                    <PaymentMethodLabel method={item.paymentMethod} />
                  </td>
                  {view === "suspended" && (
                    <td className="px-4 py-3 text-lg text-white/90 max-w-xs">
                      <p className="line-clamp-2">{item.suspendReason ?? "—"}</p>
                      {item.suspendedAt && (
                        <p className="text-sm text-on-surface-variant">
                          Desde {formatDate(item.suspendedAt)}
                        </p>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {renderActions(item)}
                  </td>
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
                    #{item.lead.id} · {item.lead.phone1}
                  </p>
                </div>
                <span className="text-white font-medium text-lg shrink-0">
                  $ {formatAmount(item.amount)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                <span>{item.product.name} · cuota {item.number} de {item.totalInstallments}</span>
                <span>{formatDate(item.date)}</span>
                {view === "overdue" && (
                  <span className="text-error">{daysLate(item.date)} días de atraso</span>
                )}
                {item.lead.company?.name && <span>{item.lead.company.name}</span>}
              </div>
              <div className="text-sm">
                <PaymentMethodLabel method={item.paymentMethod} />
              </div>
              {renderAttemptInfo(item)}
              {view === "suspended" && item.suspendReason && (
                <p className="text-sm text-white/90">Motivo: {item.suspendReason}</p>
              )}
              {renderActions(item)}
            </div>
          ))}
        </div>

        {items.length === 0 && !isLoading && (
          <div className="text-center py-12 text-white/90 text-lg">{activeTab.empty}</div>
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

      {action?.kind === "charge" && (
        <ChargeModal target={action.target} onClose={() => setAction(null)} onDone={handleDone} />
      )}
      {action?.kind === "suspend" && (
        <SuspendModal target={action.target} onClose={() => setAction(null)} onDone={handleDone} />
      )}
      {action?.kind === "reschedule" && (
        <RescheduleModal target={action.target} onClose={() => setAction(null)} onDone={handleDone} />
      )}
    </div>
  );
}
