"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { DashboardData } from "@/utils/interfaces/dashboard";
import { DashboardFilters } from "@/components/dashboard/drawAreaLine/drawHBar/drawDonut/DashboardFilters";
import { AdminDashboard } from "@/components/dashboard/drawAreaLine/drawHBar/drawDonut/AdminDashboard";
import { FranchiseDashboard } from "@/components/dashboard/drawAreaLine/drawHBar/drawDonut/FranchiseDashboard";
import { UserRole } from "@/utils/constants/roles";
import { fetcher } from "@/lib/fetcher";

interface Props {
  initialData: DashboardData;
  user: {
    id: string;
    name: string;
    role: string;
    companyId?: number;
    companyName?: string;
    teamId?: number;
  };
}

export function DashboardClient({ initialData, user }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [quincena, setQuincena] = useState<1 | 2>(now.getDate() <= 15 ? 1 : 2);
  const [companyId, setCompanyId] = useState("all");

  const isAdmin = user.role === UserRole.ADMIN;

  const swrKey = useMemo(() => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      quincena: String(quincena),
      companyId,
    });
    return `/api/dashboard?${params}`;
  }, [year, month, quincena, companyId]);

  const { data, isLoading } = useSWR<DashboardData>(swrKey, fetcher, {
    fallbackData: initialData,
  });

  const selectedCompanyName =
    companyId !== "all"
      ? data?.companies.find((c) => c.id === parseInt(companyId))?.name
      : user.companyName;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-16 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              {isAdmin ? "Casa Matriz" : "Dashboard"}
            </h1>
            {isAdmin && (
              <span className="text-sm font-medium bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full">
                Vista global
              </span>
            )}
          </div>
          <p className="text-lg text-zinc-400 mt-0.5">
            Bienvenido,{" "}
            <span className="font-medium text-zinc-600 dark:text-zinc-300">
              {user.name}
            </span>
            {user.companyName && !isAdmin && (
              <>
                {" "}
                · <span className="text-zinc-500">{user.companyName}</span>
              </>
            )}
          </p>

          {isAdmin && companyId !== "all" && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span className="text-sm text-zinc-400">
                Filtrando por:{" "}
                <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                  {selectedCompanyName}
                </span>
              </span>
              <button
                onClick={() => setCompanyId("all")}
                className="text-sm text-cyan-500 hover:text-cyan-600 ml-1 underline"
              >
                Ver todas
              </button>
            </div>
          )}
        </div>

        <DashboardFilters
          showCompanySelector={isAdmin}
          companies={data?.companies ?? []}
          companyId={companyId}
          onCompanyChange={setCompanyId}
          month={month}
          year={year}
          onDateChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
          quincena={quincena}
          onQuincenaChange={setQuincena}
        />
      </div>

      {isAdmin && companyId === "all" ? (
        <AdminDashboard
          data={data ?? null}
          loading={isLoading}
          quincena={quincena}
        />
      ) : (
        <FranchiseDashboard
          data={data ?? null}
          loading={isLoading}
          quincena={quincena}
          companyName={selectedCompanyName!}
        />
      )}
    </div>
  );
}
