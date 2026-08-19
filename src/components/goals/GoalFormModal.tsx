// ── Goal Form Modal ───────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CustomSelect } from "../ui/Select";
import { AvailableBadge } from "./AvailableBadge";
import { Company } from "@/utils/interfaces/dashboard";
import { Team } from "@/utils/interfaces/companies";
import { Goal } from "@/utils/interfaces/goals";
import { UserRole } from "@/utils/constants/roles";

const goalSchema = z.object({
  amount: z.number({ error: "Ingresa un monto válido" }).positive("Ingresa un monto válido"),
  companyId: z.string().optional(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
});
type GoalFormData = z.infer<typeof goalSchema>;

export function GoalFormModal({
  open,
  onClose,
  onSave,
  companies,
  teams,
  goals,
  year,
  month,
  quincena,
  userRole,
  userCompanyId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  companies: Company[];
  teams: Team[];
  goals: Goal[];
  year: number;
  month: number;
  quincena: number;
  userRole: string;
  userCompanyId?: number;
}) {
  const [scope, setScope] = useState<"company" | "team" | "user">("company");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { companyId: "", teamId: "", userId: "" },
  });

  const isSupervisor = userRole === UserRole.SUPERVISOR;
  const isAdmin = userRole === UserRole.ADMIN;

  const companyIdValue = watch("companyId") ?? "";
  const teamIdValue = watch("teamId") ?? "";
  const userIdValue = watch("userId") ?? "";
  const amountValue = watch("amount");

  // Filtered teams/agents based on selections
  const effectiveCompanyId = isSupervisor
    ? String(userCompanyId ?? "")
    : companyIdValue;

  const filteredTeams = effectiveCompanyId
    ? teams.filter((t) => t.companyId === parseInt(effectiveCompanyId))
    : teams;

  const selectedTeam = teams.find((t) => t.id === parseInt(teamIdValue));
  const filteredAgents = selectedTeam?.users ?? [];

  // Calculate available amounts — safe parse to avoid NaN comparisons
  const parsedCompanyId = effectiveCompanyId
    ? parseInt(effectiveCompanyId)
    : null;
  const parsedTeamId = teamIdValue ? parseInt(teamIdValue) : null;
  const parsedUserId = userIdValue ? parseInt(userIdValue) : null;

  const companyGoal =
    parsedCompanyId !== null
      ? goals.find((g) => g.companyId === parsedCompanyId)
      : undefined;

  const teamsGoals = goals.filter(
    (g) =>
      parsedCompanyId !== null &&
      g.team?.companyId === parsedCompanyId &&
      (parsedTeamId === null || g.teamId !== parsedTeamId),
  );
  const teamsSum = teamsGoals.reduce((s, g) => s + Number(g.amount), 0);
  const availableForTeams = companyGoal
    ? Number(companyGoal.amount) - teamsSum
    : null;

  const teamGoal =
    parsedTeamId !== null
      ? goals.find((g) => g.teamId === parsedTeamId)
      : undefined;

  const agentsGoals = goals.filter(
    (g) =>
      parsedTeamId !== null &&
      g.user?.teamId === parsedTeamId &&
      (parsedUserId === null || g.userId !== parsedUserId),
  );
  const agentsSum = agentsGoals.reduce((s, g) => s + Number(g.amount), 0);
  const availableForAgents = teamGoal
    ? Number(teamGoal.amount) - agentsSum
    : null;

  const currentAmount = Number.isFinite(amountValue) ? amountValue : 0;

  function getAvailableForCurrent() {
    if (scope === "team" && availableForTeams !== null)
      return availableForTeams;
    if (scope === "user" && availableForAgents !== null)
      return availableForAgents;
    return null;
  }

  const availableForCurrent = getAvailableForCurrent();

  // Reset on open — supervisor starts on "company" scope too
  useEffect(() => {
    if (!open) return;
    reset({ companyId: "", teamId: "", userId: "" });
    setScope("company");
  }, [open, reset]);

  async function onSubmit(data: GoalFormData) {
    const resolvedCompanyId = isSupervisor
      ? String(userCompanyId)
      : (data.companyId ?? "");

    if (scope === "company" && !resolvedCompanyId) {
      setError("companyId", { message: "Selecciona una franquicia" });
      return;
    }
    if (scope === "team" && !data.teamId) {
      setError("teamId", { message: "Selecciona un equipo" });
      return;
    }
    if (scope === "user" && !data.userId) {
      setError("userId", { message: "Selecciona un asesor" });
      return;
    }

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          quincena,
          amount: data.amount,
          companyId:
            scope === "company" ? parseInt(resolvedCompanyId) : undefined,
          teamId: scope === "team" ? parseInt(data.teamId!) : undefined,
          userId: scope === "user" ? parseInt(data.userId!) : undefined,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        toast.error(resData.error);
        return;
      }
      onSave();
      // Advance to next scope automatically, preserving parent selections
      const savedCompanyId = getValues("companyId");
      const savedTeamId = getValues("teamId");
      if (scope === "company") {
        toast.success("Meta de franquicia guardada. Ahora asigna la meta del equipo.");
        setScope("team");
        reset({ companyId: savedCompanyId, teamId: "", userId: "" });
      } else if (scope === "team") {
        toast.success("Meta de equipo guardada. Ahora asigna la meta del asesor.");
        setScope("user");
        reset({ companyId: savedCompanyId, teamId: savedTeamId, userId: "" });
      } else {
        onClose();
      }
    } catch {
      toast.error("Error al guardar");
    }
  }

  if (!open) return null;

  // Both ADMIN and SUPERVISOR can set company-level goals
  const scopeOptions: ("company" | "team" | "user")[] = [
    "company",
    "team",
    "user",
  ];
  const scopeLabels = { company: "Franquicia", team: "Equipo", user: "Asesor" };

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4">
          Nueva meta quincenal
        </h2>

        {/* Scope selector */}
        <div className="flex gap-2 mb-4">
          {scopeOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                scope === s
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {scopeLabels[s]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3">
            {/* Franquicia: ADMIN elige, SUPERVISOR ve la suya fija */}
            {scope === "company" && (
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                  Franquicia
                </label>
                {isAdmin ? (
                  <>
                    <Controller
                      control={control}
                      name="companyId"
                      render={({ field }) => (
                        <CustomSelect
                          name="company"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          options={["", ...companies.map((c) => String(c.id))]}
                          labels={["Seleccionar...", ...companies.map((c) => c.name)]}
                          searchable={companies.length > 5}
                        />
                      )}
                    />
                    {errors.companyId && (
                      <p className="text-red-400 text-sm mt-1">{errors.companyId.message}</p>
                    )}
                  </>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <p className="text-sm text-white font-medium">
                      {companies.find((c) => c.id === userCompanyId)?.name ??
                        "Mi franquicia"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Para team/user: ADMIN elige franquicia primero */}
            {isAdmin && (scope === "team" || scope === "user") && (
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                  Franquicia
                </label>
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <CustomSelect
                      name="company"
                      value={field.value ?? ""}
                      onChange={(v) => {
                        field.onChange(v);
                        setValue("teamId", "");
                        setValue("userId", "");
                      }}
                      options={["", ...companies.map((c) => String(c.id))]}
                      labels={["Seleccionar...", ...companies.map((c) => c.name)]}
                      searchable={companies.length > 5}
                    />
                  )}
                />
              </div>
            )}

            {/* Team selector */}
            {(scope === "team" || scope === "user") && (
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                  Equipo
                </label>
                <Controller
                  control={control}
                  name="teamId"
                  render={({ field }) => (
                    <CustomSelect
                      name="team"
                      value={field.value ?? ""}
                      onChange={(v) => {
                        field.onChange(v);
                        setValue("userId", "");
                      }}
                      options={["", ...filteredTeams.map((t) => String(t.id))]}
                      labels={["Seleccionar...", ...filteredTeams.map((t) => t.name)]}
                    />
                  )}
                />
                {errors.teamId && (
                  <p className="text-red-400 text-sm mt-1">{errors.teamId.message}</p>
                )}
              </div>
            )}

            {/* Agent selector */}
            {scope === "user" && (
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                  Asesor
                </label>
                <Controller
                  control={control}
                  name="userId"
                  render={({ field }) => (
                    <CustomSelect
                      name="agent"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={["", ...filteredAgents.map((a) => String(a.id))]}
                      labels={[
                        "Seleccionar...",
                        ...filteredAgents.map((a) => a.name),
                      ]}
                      searchable={filteredAgents.length > 5}
                    />
                  )}
                />
                {errors.userId && (
                  <p className="text-red-400 text-sm mt-1">{errors.userId.message}</p>
                )}
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                Meta (USD)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.amount && (
                <p className="text-red-400 text-sm mt-1">{errors.amount.message}</p>
              )}
              {availableForCurrent !== null && (
                <AvailableBadge
                  available={availableForCurrent - currentAmount}
                  total={
                    scope === "team"
                      ? Number(companyGoal?.amount ?? 0)
                      : Number(teamGoal?.amount ?? 0)
                  }
                />
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar meta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
