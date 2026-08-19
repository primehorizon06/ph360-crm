"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";
import { UserRole } from "@/utils/constants/roles";
import { fetcher } from "@/lib/fetcher";

interface AuditLog {
  id: number;
  action: string;
  actorId: number | null;
  actorRole: string | null;
  actorName: string | null;
  entityType: string;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_LOCKED_OUT",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "PRODUCT_CREATED",
  "PRODUCT_APPROVED",
  "PRODUCT_REJECTED",
  "COMPANY_CREATED",
  "COMPANY_UPDATED",
  "COMPANY_DELETED",
  "TEAM_CREATED",
  "TEAM_UPDATED",
  "TEAM_DELETED",
];

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: "bg-green-500/20 text-green-400",
  LOGIN_FAILED: "bg-red-500/20 text-red-400",
  LOGIN_LOCKED_OUT: "bg-red-500/20 text-red-400",
  USER_DELETED: "bg-red-500/20 text-red-400",
  COMPANY_DELETED: "bg-red-500/20 text-red-400",
  TEAM_DELETED: "bg-red-500/20 text-red-400",
  PRODUCT_REJECTED: "bg-amber-500/20 text-amber-400",
};

function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? "bg-cyan-500/20 text-cyan-400";
}

export default function AuditPage() {
  usePageTitle("Auditoría");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session.user.role !== UserRole.ADMIN)
      router.push("/");
  }, [status, session, router]);

  const key =
    status === "authenticated" && session.user.role === UserRole.ADMIN
      ? `/api/audit-logs?page=${page}${action ? `&action=${action}` : ""}`
      : null;

  const { data, isLoading } = useSWR<AuditLogResponse>(key, fetcher);

  if (status === "loading" || (isLoading && !data)) return <Loading />;

  const logs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        description={`${data?.total ?? 0} eventos registrados`}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <CustomSelect
          name="action"
          value={action || "Todas las acciones"}
          onChange={(val) => {
            setAction(val);
            setPage(1);
          }}
          options={["", ...ACTIONS]}
          labels={["Todas las acciones", ...ACTIONS]}
          searchable
        />
      </div>

      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {["Fecha", "Acción", "Actor", "Entidad", "IP"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-sm text-white/40 font-medium uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-lg text-white/50 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("es")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-sm px-2 py-1 rounded-full font-medium ${actionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lg text-white/70">
                    {log.actorName ?? "—"}
                    {log.actorRole && (
                      <span className="text-white/30 text-sm ml-1">
                        ({log.actorRole})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-lg text-white/50">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId}` : ""}
                  </td>
                  <td className="px-4 py-3 text-lg text-white/40">
                    {log.ip ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12 text-white/30 text-lg">
            No hay eventos registrados
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <span className="text-white/40 text-lg">
            Página {data.page} de {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
