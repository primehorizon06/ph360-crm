"use client";

import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MONTHS } from "@/utils/interfaces/dashboard";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale/es";
import { GoalTree } from "@/components/goals/GoalTree";
import { GoalFormModal } from "@/components/goals/GoalFormModal";
import { Plus } from "lucide-react";
import { GoalsData } from "@/utils/interfaces/goals";

// ── Helpers ───────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { data: session, status } = useSession();
  const { user, isLoading } = usePermissions();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [quincena, setQuincena] = useState<1 | 2>(now.getDate() <= 15 ? 1 : 2);

  const [data, setData] = useState<GoalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isSupervisor = user?.role === "SUPERVISOR";
  const canEdit = isAdmin || isSupervisor;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        quincena: String(quincena),
      });
      const res = await fetch(`/api/goals?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [year, month, quincena]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta meta?")) return;
    setDeleting(id);
    try {
      const res = await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error);
        return;
      }
      fetchData();
    } finally {
      setDeleting(null);
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40 text-sm animate-pulse">
        Cargando...
      </div>
    );
  }

  if (!session) {
    router.push("/auth/login");
    return null;
  }
  if (!canEdit) {
    router.push("/");
    return null;
  }

  const selectedDate = new Date(year, month - 1, 1);
  const selectCls =
    "text-sm px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer";

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 pt-8 pb-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Metas quincenales</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Histórico y distribución de metas por franquicia, equipo y asesor
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {/* Month/Year picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
              Período
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => {
                if (!date) return;
                setMonth(date.getMonth() + 1);
                setYear(date.getFullYear());
              }}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              locale={es}
              maxDate={new Date()}
              className={selectCls + " w-36"}
            />
          </div>

          {/* Quincena */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
              Quincena
            </label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {([1, 2] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuincena(q)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    quincena === q
                      ? "bg-cyan-500 text-white"
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  }`}
                >
                  {q === 1 ? "1 – 15" : "16 – fin"}
                </button>
              ))}
            </div>
          </div>

          {/* New goal button */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-transparent font-medium">
              _
            </label>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              Nueva meta
            </button>
          </div>
        </div>
      </div>

      {/* Period summary */}
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-xs text-white/40">Período:</span>
        <span className="text-sm font-medium text-white">
          {MONTHS[month - 1]} {year} ·{" "}
          {quincena === 1 ? "1 al 15" : "16 al fin de mes"}
        </span>
      </div>

      {/* Goals tree */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Admin sees full tree, supervisor sees only their company */}
          {isAdmin ? (
            <GoalTree
              goals={data.goals}
              companies={data.companies}
              teams={data.teams}
              onDelete={handleDelete}
              canEdit={canEdit}
            />
          ) : (
            <GoalTree
              goals={data.goals}
              companies={[
                {
                  id: user?.companyId ?? 0,
                  name: user?.companyName ?? "Mi franquicia",
                },
              ]}
              teams={data.teams}
              onDelete={handleDelete}
              canEdit={canEdit}
            />
          )}

          {data.goals.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <p className="text-lg font-medium">Sin metas para este período</p>
              <p className="text-sm mt-1">
                Crea la primera meta con el botón &ldquo;Nueva meta&ldquo;
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-white/30 py-16">Error cargando datos</p>
      )}

      {/* Modal */}
      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={fetchData}
        companies={data?.companies ?? []}
        teams={data?.teams ?? []}
        goals={data?.goals ?? []}
        year={year}
        month={month}
        quincena={quincena}
        userRole={user?.role ?? ""}
        userCompanyId={user?.companyId ?? 0}
      />
    </div>
  );
}
