"use client";

import {
  delta,
  isUp,
  CUSTOMER_STATUS_LABELS,
  FranchiseDashboardProps,
} from "@/utils/interfaces/dashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard, SkeletonCard, SkeletonChart } from "@/components/dashboard/ChartCard";
import { fmt } from "@/utils/helpers/format";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const GRID = "rgba(107,114,128,0.15)";
const TICK = "#6b7280";

export function FranchiseDashboard({ data, loading, quincena, companyName }: FranchiseDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { kpis, agentRanking } = data;

  const META_QUINCENA = data.goalAmount ?? 0;
  const metaPctRaw = META_QUINCENA > 0 ? Math.min((kpis.revenue / META_QUINCENA) * 100, 100) : 0;
  const metaPctDisplay =
    metaPctRaw === 0 ? "0%" : metaPctRaw < 1 ? metaPctRaw.toFixed(1) + "%" : Math.round(metaPctRaw) + "%";
  const todayLeads = data.leadsPerDay.find((d) => d.day === new Date().getDate())?.count ?? 0;
  const currentUserId = data.meta.currentUserId;

  const goalHistoricoSorted = [...(data.goalHistorico ?? [])].reverse().map((g) => ({
    label: `${MONTHS_SHORT[g.month - 1]} Q${g.quincena}`,
    revenue: g.revenue,
    meta: g.amount,
  }));

  const carteraData = data.customerStatus.map((s) => ({
    label: CUSTOMER_STATUS_LABELS[s.status ?? ""] ?? s.status ?? "—",
    count: s.count,
  }));

  return (
    <div className="space-y-6">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Recaudo quincena"
          value={fmt(kpis.revenue)}
          delta={delta(kpis.revenue, kpis.prevRevenue)}
          up={isUp(kpis.revenue, kpis.prevRevenue)}
          variant="accent"
          sublabel="Cuotas PAID"
        />
        <StatCard label="Recaudo hoy" value={fmt(kpis.revenueDiario)} sublabel="Cuotas PAID del día" />
        <StatCard
          label="Ventas hoy"
          value={String(kpis.ventasHoy)}
          sublabel={`Quincena: ${kpis.conversions} conv.`}
          delta={delta(kpis.conversions, kpis.prevConversions)}
          up={isUp(kpis.conversions, kpis.prevConversions)}
        />
        <StatCard
          label="Caída"
          value={String(kpis.caida)}
          sublabel={`${kpis.cuotasFallidas} cuotas · ${kpis.leadsSuspendidos} suspendidos`}
          variant={kpis.caida > 0 ? "danger" : "default"}
        />
      </div>

      {/* ── Cumplimiento de meta ── */}
      {data.goalAmount !== null ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Cumplimiento de meta</p>
              <p className="text-md text-zinc-400">
                {companyName ?? "Franquicia"} · meta {fmt(META_QUINCENA)}
              </p>
            </div>
            <span
              className={`text-2xl font-bold ${
                metaPctRaw >= 100 ? "text-emerald-500" : metaPctRaw >= 70 ? "text-amber-500" : "text-red-400"
              }`}
            >
              {metaPctDisplay}
            </span>
          </div>
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                metaPctRaw >= 100 ? "bg-emerald-500" : metaPctRaw >= 70 ? "bg-amber-500" : "bg-red-400"
              }`}
              style={{ width: metaPctRaw + "%" }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-md text-zinc-400">
            <span>{fmt(kpis.revenue)} recaudado</span>
            <span>{fmt(Math.max(META_QUINCENA - kpis.revenue, 0))} restante</span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl px-4 py-3 text-sm text-amber-400">
          Sin meta asignada para esta quincena. Contacta a tu supervisor para asignar una meta.
        </div>
      )}

      {/* ── Recaudo diario + Panel de ventas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Recaudo diario"
          subtitle={`Cuotas PAID · ${quincena === 1 ? "1er quincena" : "2da quincena"}`}
          className="lg:col-span-2"
        >
          {data.revenuePorDia.every((d) => d.amount === 0) ? (
            <p className="text-md text-zinc-400 text-center py-10">Sin recaudo registrado</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.revenuePorDia} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: TICK }} />
                <YAxis
                  tick={{ fontSize: 10, fill: TICK }}
                  tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`)}
                  width={44}
                />
                <Tooltip formatter={(v) => [fmt(v as number), "Recaudo"]} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#06b6d4" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Panel de ventas">
          <div className="space-y-4">
            <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-cyan-500 uppercase tracking-wider font-medium mb-1">Hoy</p>
              <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{kpis.ventasHoy}</p>
              <p className="text-md text-zinc-400 mt-0.5">conversiones</p>
              <p className="text-lg font-semibold text-zinc-600 dark:text-zinc-300 mt-2">{todayLeads}</p>
              <p className="text-md text-zinc-400">leads nuevos</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-1">Quincena</p>
              <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-200">{kpis.conversions}</p>
              <p className="text-md text-zinc-400 mt-0.5">conversiones</p>
              <p className="text-lg font-semibold text-zinc-600 dark:text-zinc-300 mt-2">{kpis.newLeads}</p>
              <p className="text-md text-zinc-400">leads nuevos</p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Histórico de metas ── */}
      {goalHistoricoSorted.length > 0 && (
        <ChartCard title="Histórico de metas" subtitle="Recaudo real vs meta — últimas 6 quincenas">
          <div className="flex gap-4 mb-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-cyan-500 inline-block rounded" />
              Recaudo real
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-amber-400 inline-block rounded border-dashed" />
              Meta
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={goalHistoricoSorted} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: TICK }} />
              <YAxis
                tick={{ fontSize: 10, fill: TICK }}
                tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`)}
                width={44}
              />
              <Tooltip formatter={(v) => [fmt(v as number)]} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Recaudo"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3, fill: "#06b6d4" }}
              />
              <Line
                type="monotone"
                dataKey="meta"
                name="Meta"
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: "#fbbf24" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Ranking asesores + Estado cartera ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Ranking de asesores" subtitle="Por recaudo efectivo (PAID)">
          {agentRanking.length > 0 ? (
            <div className="space-y-2">
              {agentRanking.slice(0, 8).map((a, i) => {
                const maxRec = agentRanking[0].recaudo || 1;
                const pct = Math.round((a.recaudo / maxRec) * 100);
                const medalColors = ["#f59e0b", "#9ca3af", "#cd7c54"];
                const isMe = currentUserId === a.id;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-colors ${
                      isMe ? "bg-cyan-500/10 ring-1 ring-cyan-500/30" : ""
                    }`}
                  >
                    <span
                      className={`text-md font-bold w-5 text-center ${i < 3 ? "" : "text-zinc-400"}`}
                      style={i < 3 ? { color: medalColors[i] } : {}}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-md w-24 truncate font-medium ${isMe ? "text-cyan-400" : "text-zinc-600 dark:text-zinc-300"}`}
                    >
                      {a.name}
                      {isMe && (
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                          tú
                        </span>
                      )}
                    </span>
                    <div className="flex-1 h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${isMe ? "bg-cyan-400" : "bg-cyan-500"}`}
                        style={{ width: pct + "%" }}
                      />
                    </div>
                    <span
                      className={`text-md font-semibold w-16 text-right ${isMe ? "text-cyan-400" : "text-zinc-700 dark:text-zinc-200"}`}
                    >
                      {fmt(a.recaudo)}
                    </span>
                    <span className="text-md text-zinc-400 w-14 text-right">{a.conversiones} conv.</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-md text-zinc-400 text-center py-8">Sin recaudo en este período</p>
          )}
        </ChartCard>

        <ChartCard title="Estado de cartera" subtitle="Clientes activos por estado">
          {carteraData.length > 0 ? (
            <ResponsiveContainer width="100%" height={carteraData.length * 42 + 16}>
              <BarChart
                data={carteraData}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: TICK }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: TICK }} width={130} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={5} label={{ position: "right", fontSize: 11, fill: TICK }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-md text-zinc-400 text-center mt-2">Sin clientes activos</p>
          )}
        </ChartCard>
      </div>

      {/* ── Caída detallada ── */}
      {kpis.caida > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
              <span className="text-red-500 text-lg font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                Caída — {companyName ?? "Franquicia"}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 text-center border border-red-100 dark:border-red-900">
                  <p className="text-2xl font-bold text-red-500">{kpis.cuotasFallidas}</p>
                  <p className="text-md text-zinc-400 mt-0.5">Cuotas fallidas</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 text-center border border-red-100 dark:border-red-900">
                  <p className="text-2xl font-bold text-red-500">{kpis.leadsSuspendidos}</p>
                  <p className="text-md text-zinc-400 mt-0.5">Clientes suspendidos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
