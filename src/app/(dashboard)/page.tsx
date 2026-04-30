"use client";

import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  meta: {
    year: number;
    month: number;
    quincena: number;
    companyId: number | null;
  };
  companies: { id: number; name: string }[];
  kpis: {
    newLeads: number;
    prevNewLeads: number;
    conversions: number;
    prevConversions: number;
    revenue: number;
    prevRevenue: number;
    pendingApprovals: number;
  };
  funnel: { status: string; count: number }[];
  customerStatus: { status: string | null; count: number }[];
  productos: { type: string; count: number }[];
  agentPerformance: { name: string; leads: number; customers: number }[];
  leadsPerDay: { day: number; count: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const FUNNEL_LABELS: Record<string, string> = {
  newLead: "Nuevo lead",
  leadWithData: "Con datos",
  pendingSS: "Pend. SS",
  pendingAnalysis: "Análisis",
  pendingAccount: "Pend. cuenta",
  pendingPayments: "Pend. pagos",
  suspended: "Suspendido",
};

const PRODUCT_LABELS: Record<string, string> = {
  ALERTA_ANUAL: "Alerta anual",
  ALERTA_TRIMESTRAL: "Alerta trimestral",
  REPARACION_CREDITO: "Reparación crédito",
  FORTALECIMIENTO_FINANCIERO: "Fort. financiero",
};

const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  CONTRACT_SENT: "Contrato enviado",
  PENDING_PAYMENT_AGREEMENT: "Acuerdo pago",
  PENDING_DOCS: "Docs pendientes",
  DISPUTE_1: "Disputa 1",
  DISPUTE_2: "Disputa 2",
  DISPUTE_3: "Disputa 3",
  ACTIVE_ALERT: "Alerta activa",
  PENDING_LOYALTY: "Pend. lealtad",
  LOYALTY_OK: "Lealtad ok",
  CANCELLED: "Cancelado",
};

function delta(current: number, prev: number) {
  if (prev === 0) return current > 0 ? "+100%" : "—";
  const pct = Math.round(((current - prev) / prev) * 100);
  return (pct >= 0 ? "+" : "") + pct + "%";
}

function isUp(current: number, prev: number) {
  return current >= prev;
}

function fmt(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

// ── Chart helpers (vanilla canvas, no lib needed for simple charts) ────────────

function drawHBar(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  color: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const rowH = 36;
  const H = labels.length * rowH + 20;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + "px";
  ctx.scale(dpr, dpr);

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const textColor = isDark ? "#ccc" : "#555";
  const max = Math.max(...values, 1);
  const labelW = 110;
  const barW = W - labelW - 40;

  ctx.clearRect(0, 0, W, H);
  ctx.font = "12px system-ui";

  labels.forEach((label, i) => {
    const y = i * rowH + 10;
    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.fillText(label, labelW - 6, y + 14);

    const bw = (values[i] / max) * barW;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(labelW, y + 4, Math.max(bw, 2), 18, 4);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.fillText(String(values[i]), labelW + bw + 6, y + 14);
  });
}

function drawDonut(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  colors: string[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.offsetWidth, 200);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  ctx.scale(dpr, dpr);

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return;

  const cx = size / 2,
    cy = size / 2,
    r = size * 0.38,
    inner = size * 0.22;
  let angle = -Math.PI / 2;

  values.forEach((v, i) => {
    const slice = (v / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    angle += slice;
  });

  // Inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  ctx.fillStyle = isDark ? "#1a1a1a" : "#ffffff";
  ctx.fill();

  // Center text
  ctx.fillStyle = isDark ? "#eee" : "#222";
  ctx.font = `500 ${Math.round(size * 0.14)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(total), cx, cy);
}

function drawLine(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  color: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = 160;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + "px";
  ctx.scale(dpr, dpr);

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#888" : "#aaa";
  const padL = 28,
    padR = 12,
    padT = 12,
    padB = 28;
  const W2 = W - padL - padR;
  const H2 = H - padT - padB;
  const max = Math.max(...values, 1);

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const y = padT + H2 * (1 - t);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(max * t)), padL - 4, y + 3);
  });

  if (values.length < 2) return;

  const xStep = W2 / (values.length - 1);

  // Fill area
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = padT + H2 * (1 - v / max);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + (values.length - 1) * xStep, padT + H2);
  ctx.lineTo(padL, padT + H2);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + H2);
  grad.addColorStop(0, color + "40");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  values.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = padT + H2 * (1 - v / max);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  values.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = padT + H2 * (1 - v / max);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // X labels — show every other day to avoid overlap
  ctx.fillStyle = textColor;
  ctx.font = "10px system-ui";
  ctx.textAlign = "center";
  labels.forEach((label, i) => {
    if (i % 2 !== 0) return;
    const x = padL + i * xStep;
    ctx.fillText(label, x, H - 6);
  });
}

// Sub-components

function KpiCard({
  label,
  value,
  deltaStr,
  up,
  accent,
}: {
  label: string;
  value: string;
  deltaStr: string;
  up: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-1 border ${
        accent
          ? "bg-blue-600 border-blue-500 text-white"
          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <span
        className={`text-xs font-medium uppercase tracking-wider ${
          accent ? "text-blue-200" : "text-zinc-400"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-2xl font-bold ${accent ? "text-white" : "text-zinc-800 dark:text-zinc-100"}`}
      >
        {value}
      </span>
      <span
        className={`text-xs font-medium ${
          accent ? "text-blue-200" : up ? "text-emerald-500" : "text-red-400"
        }`}
      >
        {deltaStr} vs quincena ant.
      </span>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const { data: session, status } = useSession();
  const { user, isLoading } = usePermissions();
  const router = useRouter();

  const now = new Date();

  // Last 24 months as options so year changes automatically
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    };
  });

  const [selectedKey, setSelectedKey] = useState(
    `${now.getFullYear()}-${now.getMonth() + 1}`,
  );
  const selected =
    monthOptions.find((o) => o.key === selectedKey) ?? monthOptions[0];
  const year = selected.year;
  const month = selected.month;

  const [quincena, setQuincena] = useState<1 | 2>(now.getDate() <= 15 ? 1 : 2);
  const [companyId, setCompanyId] = useState<string>("all");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Canvas refs
  const funnelRef = useRef<HTMLCanvasElement>(null);
  const productRef = useRef<HTMLCanvasElement>(null);
  const customerStatusRef = useRef<HTMLCanvasElement>(null);
  const dailyLeadsRef = useRef<HTMLCanvasElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      quincena: String(quincena),
      companyId,
    });
    try {
      const res = await fetch(`/api/dashboard?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [year, month, quincena, companyId, selectedKey]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  // Draw charts after data loads
  useEffect(() => {
    if (!data) return;

    if (funnelRef.current) {
      const labels = data.funnel.map(
        (f) => FUNNEL_LABELS[f.status] ?? f.status,
      );
      const values = data.funnel.map((f) => f.count);
      drawHBar(funnelRef.current, labels, values, "#3b82f6");
    }

    if (productRef.current && data.productos.length > 0) {
      const labels = data.productos.map(
        (p) => PRODUCT_LABELS[p.type] ?? p.type,
      );
      const values = data.productos.map((p) => p.count);
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
      drawDonut(productRef.current, labels, values, colors);
    }

    if (customerStatusRef.current && data.customerStatus.length > 0) {
      const labels = data.customerStatus.map(
        (s) => CUSTOMER_STATUS_LABELS[s.status ?? ""] ?? s.status ?? "—",
      );
      const values = data.customerStatus.map((s) => s.count);
      drawHBar(customerStatusRef.current, labels, values, "#10b981");
    }
    if (dailyLeadsRef.current && data.leadsPerDay.length > 0) {
      const labels = data.leadsPerDay.map((d) => String(d.day));
      const values = data.leadsPerDay.map((d) => d.count);
      drawLine(dailyLeadsRef.current, labels, values, "#06b6d4");
    }
  }, [data]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400 text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    router.push("/auth/login");
    return null;
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-16 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Bienvenido,{" "}
            <span className="font-medium text-zinc-600 dark:text-zinc-300">
              {user?.name}
            </span>
            {user?.companyName && (
              <>
                {" "}
                · <span className="text-zinc-500">{user.companyName}</span>
              </>
            )}
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-end gap-2">
          {/* Company selector — admin only */}
          {isAdmin && data?.companies && data.companies.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                Franquicia
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
              >
                <option value="all">Todas</option>
                {data.companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month + Year combined */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              Mes
            </label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
            >
              {monthOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quincena toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              Quincena
            </label>
            <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
              {([1, 2] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuincena(q)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    quincena === q
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {q === 1 ? "1 – 15" : "16 – fin"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-zinc-400 text-sm animate-pulse">
          Cargando datos...
        </div>
      ) : data ? (
        <>
          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Nuevos leads"
              value={String(data.kpis.newLeads)}
              deltaStr={delta(data.kpis.newLeads, data.kpis.prevNewLeads)}
              up={isUp(data.kpis.newLeads, data.kpis.prevNewLeads)}
            />
            <KpiCard
              label="Conversiones"
              value={String(data.kpis.conversions)}
              deltaStr={delta(data.kpis.conversions, data.kpis.prevConversions)}
              up={isUp(data.kpis.conversions, data.kpis.prevConversions)}
              accent
            />
            <KpiCard
              label="Revenue"
              value={fmt(data.kpis.revenue)}
              deltaStr={delta(data.kpis.revenue, data.kpis.prevRevenue)}
              up={isUp(data.kpis.revenue, data.kpis.prevRevenue)}
            />
            <KpiCard
              label="Aprob. pendientes"
              value={String(data.kpis.pendingApprovals)}
              deltaStr={
                data.kpis.pendingApprovals > 0 ? "Requieren atención" : "Al día"
              }
              up={data.kpis.pendingApprovals === 0}
            />
          </div>

          {/* ── Charts row 1 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Funnel de ventas — leads por etapa">
              <canvas ref={funnelRef} style={{ width: "100%" }} />
              {data.funnel.every((f) => f.count === 0) && (
                <p className="text-xs text-zinc-400 text-center mt-2">
                  Sin datos en este período
                </p>
              )}
            </ChartCard>

            <ChartCard title="Productos vendidos">
              {data.productos.length > 0 ? (
                <div className="flex items-center gap-4">
                  <canvas ref={productRef} />
                  <div className="flex flex-col gap-2 flex-1">
                    {data.productos.map((p, i) => {
                      const colors = [
                        "#3b82f6",
                        "#10b981",
                        "#f59e0b",
                        "#8b5cf6",
                      ];
                      return (
                        <div
                          key={p.type}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ background: colors[i % colors.length] }}
                          />
                          <span className="text-zinc-500 dark:text-zinc-400 flex-1">
                            {PRODUCT_LABELS[p.type] ?? p.type}
                          </span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                            {p.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-8">
                  Sin productos en este período
                </p>
              )}
            </ChartCard>
          </div>

          {/* ── Leads diarios ── */}
          <ChartCard
            title={`Leads nuevos por día — ${quincena === 1 ? "del 1 al 15" : "del 16 al fin de mes"}`}
          >
            <canvas ref={dailyLeadsRef} style={{ width: "100%" }} />
            {data.leadsPerDay.every((d) => d.count === 0) && (
              <p className="text-xs text-zinc-400 text-center mt-2">
                Sin leads en este período
              </p>
            )}
          </ChartCard>

          {/* ── Charts row 2 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Estado de clientes activos">
              <canvas ref={customerStatusRef} style={{ width: "100%" }} />
              {data.customerStatus.length === 0 && (
                <p className="text-xs text-zinc-400 text-center mt-2">
                  Sin datos
                </p>
              )}
            </ChartCard>

            <ChartCard title="Rendimiento por agente">
              {data.agentPerformance.length > 0 ? (
                <div className="space-y-2">
                  {data.agentPerformance.slice(0, 8).map((a, i) => {
                    const max = data.agentPerformance[0].customers || 1;
                    const pct = Math.round((a.customers / max) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 w-5 text-right">
                          {i + 1}
                        </span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-300 w-24 truncate font-medium">
                          {a.name}
                        </span>
                        <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded transition-all"
                            style={{ width: pct + "%" }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-12 text-right">
                          {a.customers} conv.
                        </span>
                        <span className="text-xs text-zinc-400 w-14 text-right">
                          {a.leads} leads
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-8">
                  Sin actividad en este período
                </p>
              )}
            </ChartCard>
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-400 text-center py-16">
          Error cargando datos.
        </p>
      )}
    </div>
  );
}
