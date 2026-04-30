"use client";

import { useEffect, useRef } from "react";
import {
  fmt,
  delta,
  isUp,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
  adminDashboardProps,
} from "@/utils/interfaces/dashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  ChartCard,
  drawAreaLine,
  drawHBar,
  drawDonut,
  SkeletonCard,
  SkeletonChart,
} from "@/components/dashboard/ChartCard";

export function AdminDashboard({
  data,
  loading,
  quincena,
}: adminDashboardProps) {
  const recaudoAreaRef = useRef<HTMLCanvasElement>(null);
  const recaudoFranqRef = useRef<HTMLCanvasElement>(null);
  const pieStatusRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data) return;

    // Gráfico área: recaudo por día
    if (recaudoAreaRef.current) {
      const labels = data.revenuePorDia.map((d) => String(d.day));
      const values = data.revenuePorDia.map((d) => d.amount);
      drawAreaLine(recaudoAreaRef.current, labels, values, "#06b6d4");
    }

    // Barra horizontal: recaudo por franquicia
    if (recaudoFranqRef.current && data.recaudoPorFranquicia.length > 0) {
      const labels = data.recaudoPorFranquicia.map((f) => f.name);
      const values = data.recaudoPorFranquicia.map((f) => f.recaudo);
      drawHBar(recaudoFranqRef.current, labels, values, "#06b6d4", fmt);
    }

    // Donut: distribución de estados de cuotas
    if (pieStatusRef.current && data.installmentStatusDist.length > 0) {
      const labels = data.installmentStatusDist.map(
        (s) => INSTALLMENT_STATUS_LABELS[s.status] ?? s.status,
      );
      const values = data.installmentStatusDist.map((s) => s.count);
      const colors = data.installmentStatusDist.map(
        (s) => INSTALLMENT_STATUS_COLORS[s.status] ?? "#6b7280",
      );
      drawDonut(pieStatusRef.current, labels, values, colors);
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
  const { kpis } = data;

  const todayLeads =
    data.leadsPerDay.find((d) => d.day === new Date().getDate())?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Recaudo quincena"
          value={fmt(kpis.revenue)}
          delta={delta(kpis.revenue, kpis.prevRevenue)}
          up={isUp(kpis.revenue, kpis.prevRevenue)}
          variant="accent"
          sublabel="Solo cuotas PAID"
        />
        <StatCard
          label="Recaudo hoy"
          value={fmt(kpis.revenueDiario)}
          sublabel={`Quincena: ${fmt(kpis.revenue)}`}
        />
        <StatCard
          label="Ventas hoy"
          value={String(kpis.ventasHoy)}
          delta={delta(kpis.conversions, kpis.prevConversions)}
          up={isUp(kpis.conversions, kpis.prevConversions)}
          sublabel={`Quincena: ${kpis.conversions} conv.`}
        />
        <StatCard
          label="Caída"
          value={String(kpis.caida)}
          sublabel={`${kpis.cuotasFallidas} cuotas · ${kpis.leadsSuspendidos} suspendidos`}
          variant={kpis.caida > 0 ? "danger" : "default"}
        />
      </div>

      {/* ── Gráfico de recaudo quincenal por día ── */}
      <ChartCard
        title="Recaudo quincenal acumulado"
        subtitle={`Cuotas PAID · ${quincena === 1 ? "1 al 15" : "16 al fin de mes"}`}
      >
        <canvas ref={recaudoAreaRef} style={{ width: "100%" }} />
        {data.revenuePorDia.every((d) => d.amount === 0) && (
          <p className="text-md text-zinc-400 text-center mt-2">
            Sin recaudo en este período
          </p>
        )}
      </ChartCard>

      {/* ── Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recaudo por franquicia */}
        <ChartCard
          title="Recaudo por franquicia"
          subtitle="Ranking quincenal PAID"
        >
          {data.recaudoPorFranquicia.length > 0 ? (
            <canvas ref={recaudoFranqRef} style={{ width: "100%" }} />
          ) : (
            <p className="text-md text-zinc-400 text-center py-8">
              {data.meta.companyId
                ? "Selecciona 'Todas' para ver el ranking"
                : "Sin datos"}
            </p>
          )}
        </ChartCard>

        {/* Distribución estados de cuotas */}
        <ChartCard
          title="Distribución de estados de pagos"
          subtitle="Pie chart global"
        >
          {data.installmentStatusDist.length > 0 ? (
            <div className="flex items-center gap-4">
              <canvas ref={pieStatusRef} />
              <div className="flex flex-col gap-2 flex-1">
                {data.installmentStatusDist.map((s) => {
                  const total = data.installmentStatusDist.reduce(
                    (a, b) => a + b.count,
                    0,
                  );
                  const pct =
                    total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div
                      key={s.status}
                      className="flex items-center gap-2 text-md"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{
                          background:
                            INSTALLMENT_STATUS_COLORS[s.status] ?? "#6b7280",
                        }}
                      />
                      <span className="text-zinc-500 dark:text-zinc-400 flex-1">
                        {INSTALLMENT_STATUS_LABELS[s.status] ?? s.status}
                      </span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        {pct}%
                      </span>
                      <span className="text-zinc-400">({s.count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-md text-zinc-400 text-center py-8">
              Sin cuotas en este período
            </p>
          )}
        </ChartCard>
      </div>

      {/* ── Ventas: Hoy vs Quincena ── */}
      <ChartCard title="Ventas del día vs acumulado quincenal">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <span className="text-md text-zinc-400 uppercase tracking-wider mb-2">
              Hoy
            </span>
            <span className="text-4xl font-bold text-cyan-500">
              {todayLeads}
            </span>
            <span className="text-md text-zinc-400 mt-1">leads nuevos</span>
            <span className="text-2xl font-bold text-zinc-700 dark:text-zinc-200 mt-3">
              {kpis.ventasHoy}
            </span>
            <span className="text-md text-zinc-400">conversiones</span>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <span className="text-md text-zinc-400 uppercase tracking-wider mb-2">
              Quincena
            </span>
            <span className="text-4xl font-bold text-zinc-700 dark:text-zinc-200">
              {kpis.newLeads}
            </span>
            <span className="text-md text-zinc-400 mt-1">leads nuevos</span>
            <span className="text-2xl font-bold text-cyan-500 mt-3">
              {kpis.conversions}
            </span>
            <span className="text-md text-zinc-400">conversiones</span>
          </div>
        </div>
      </ChartCard>

      {/* ── Indicador de caída detallado ── */}
      {kpis.caida > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-500 text-lg font-bold">!</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                Alerta de caída
              </p>
              <p className="text-md text-red-500 dark:text-red-500 mt-1">
                <span className="font-bold">{kpis.cuotasFallidas}</span> cuotas
                fallidas ·{" "}
                <span className="font-bold">{kpis.leadsSuspendidos}</span>{" "}
                clientes suspendidos
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
