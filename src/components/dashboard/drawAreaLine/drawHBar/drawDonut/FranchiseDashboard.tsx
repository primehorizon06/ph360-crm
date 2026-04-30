"use client";

import { useEffect, useRef } from "react";
import {
  DashboardData,
  fmt,
  delta,
  isUp,
  CUSTOMER_STATUS_LABELS,
  FranchiseDashboardProps,
} from "@/utils/interfaces/dashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  ChartCard,
  drawAreaLine,
  drawHBar,
  SkeletonCard,
  SkeletonChart,
} from "@/components/dashboard/ChartCard";

// Meta fija por quincena — en el futuro puede venir de la API
const META_QUINCENA = 5_000;

export function FranchiseDashboard({
  data,
  loading,
  quincena,
  companyName,
}: FranchiseDashboardProps) {
  const recaudoDualRef = useRef<HTMLCanvasElement>(null);
  const carteraRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data) return;

    // Gráfico dual: recaudo diario vs quincenal acumulado (dos líneas)
    if (recaudoDualRef.current) {
      const labels = data.revenuePorDia.map((d) => String(d.day));
      const values = data.revenuePorDia.map((d) => d.amount);
      drawAreaLine(recaudoDualRef.current, labels, values, "#06b6d4");
    }

    // Barra: estado de cartera (customerStatus)
    if (carteraRef.current && data.customerStatus.length > 0) {
      const labels = data.customerStatus.map(
        (s) => CUSTOMER_STATUS_LABELS[s.status ?? ""] ?? s.status ?? "—",
      );
      const values = data.customerStatus.map((s) => s.count);
      drawHBar(carteraRef.current, labels, values, "#8b5cf6");
    }
  }, [data]);

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

  const metaPct =
    META_QUINCENA > 0
      ? Math.min(Math.round((kpis.revenue / META_QUINCENA) * 100), 100)
      : 0;
  const todayLeads =
    data.leadsPerDay.find((d) => d.day === new Date().getDate())?.count ?? 0;

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
        <StatCard
          label="Recaudo hoy"
          value={fmt(kpis.revenueDiario)}
          sublabel="Cuotas PAID del día"
        />
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
              Cumplimiento de meta
            </p>
            <p className="text-md text-zinc-400">
              {companyName ?? "Franquicia"} · meta {fmt(META_QUINCENA)}
            </p>
          </div>
          <span
            className={`text-2xl font-bold ${metaPct >= 100 ? "text-emerald-500" : metaPct >= 70 ? "text-amber-500" : "text-red-400"}`}
          >
            {metaPct}%
          </span>
        </div>
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              metaPct >= 100
                ? "bg-emerald-500"
                : metaPct >= 70
                  ? "bg-amber-500"
                  : "bg-red-400"
            }`}
            style={{ width: metaPct + "%" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-md text-zinc-400">
          <span>{fmt(kpis.revenue)} recaudado</span>
          <span>{fmt(Math.max(META_QUINCENA - kpis.revenue, 0))} restante</span>
        </div>
      </div>

      {/* ── Recaudo dual (gráfico + comparativa) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Recaudo diario"
          subtitle={`Cuotas PAID · ${quincena === 1 ? "1 al 15" : "16 al fin"}`}
          className="lg:col-span-2"
        >
          <canvas ref={recaudoDualRef} style={{ width: "100%" }} />
          {data.revenuePorDia.every((d) => d.amount === 0) && (
            <p className="text-md text-zinc-400 text-center mt-2">
              Sin recaudo registrado
            </p>
          )}
        </ChartCard>

        {/* Panel ventas hoy vs quincena */}
        <ChartCard title="Panel de ventas">
          <div className="space-y-4">
            <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-cyan-500 uppercase tracking-wider font-medium mb-1">
                Hoy
              </p>
              <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                {kpis.ventasHoy}
              </p>
              <p className="text-md text-zinc-400 mt-0.5">conversiones</p>
              <p className="text-lg font-semibold text-zinc-600 dark:text-zinc-300 mt-2">
                {todayLeads}
              </p>
              <p className="text-md text-zinc-400">leads nuevos</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-1">
                Quincena
              </p>
              <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-200">
                {kpis.conversions}
              </p>
              <p className="text-md text-zinc-400 mt-0.5">conversiones</p>
              <p className="text-lg font-semibold text-zinc-600 dark:text-zinc-300 mt-2">
                {kpis.newLeads}
              </p>
              <p className="text-md text-zinc-400">leads nuevos</p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Ranking asesores + Estado cartera ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ranking de asesores por recaudo */}
        <ChartCard
          title="Ranking de asesores"
          subtitle="Por recaudo efectivo (PAID)"
        >
          {agentRanking.length > 0 ? (
            <div className="space-y-2">
              {agentRanking.slice(0, 8).map((a, i) => {
                const maxRec = agentRanking[0].recaudo || 1;
                const pct = Math.round((a.recaudo / maxRec) * 100);
                const medalColors = ["#f59e0b", "#9ca3af", "#cd7c54"];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className={`text-md font-bold w-5 text-center ${i < 3 ? "" : "text-zinc-400"}`}
                      style={i < 3 ? { color: medalColors[i] } : {}}
                    >
                      {i + 1}
                    </span>
                    <span className="text-md text-zinc-600 dark:text-zinc-300 w-24 truncate font-medium">
                      {a.name}
                    </span>
                    <div className="flex-1 h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded transition-all"
                        style={{ width: pct + "%" }}
                      />
                    </div>
                    <span className="text-md font-semibold text-zinc-700 dark:text-zinc-200 w-16 text-right">
                      {fmt(a.recaudo)}
                    </span>
                    <span className="text-md text-zinc-400 w-14 text-right">
                      {a.conversiones} conv.
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-md text-zinc-400 text-center py-8">
              Sin recaudo en este período
            </p>
          )}
        </ChartCard>

        {/* Estado de cartera */}
        <ChartCard
          title="Estado de cartera"
          subtitle="Clientes activos por estado"
        >
          <canvas ref={carteraRef} style={{ width: "100%" }} />
          {data.customerStatus.length === 0 && (
            <p className="text-md text-zinc-400 text-center mt-2">
              Sin clientes activos
            </p>
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
                  <p className="text-2xl font-bold text-red-500">
                    {kpis.cuotasFallidas}
                  </p>
                  <p className="text-md text-zinc-400 mt-0.5">
                    Cuotas fallidas
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 text-center border border-red-100 dark:border-red-900">
                  <p className="text-2xl font-bold text-red-500">
                    {kpis.leadsSuspendidos}
                  </p>
                  <p className="text-md text-zinc-400 mt-0.5">
                    Clientes suspendidos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
