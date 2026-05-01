// ── Goal Form Modal ───────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { CustomSelect } from "../ui/Select";
import { AvailableBadge } from "./AvailableBadge";
import { Company } from "@/utils/interfaces/dashboard";
import { Team } from "@/utils/interfaces/companies";
import { Goal } from "@/utils/interfaces/goals";

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
  const [companyId, setCompanyId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSupervisor = userRole === "SUPERVISOR";
  const isAdmin = userRole === "ADMIN";

  // Filtered teams/agents based on selections
  const effectiveCompanyId = isSupervisor
    ? String(userCompanyId ?? "")
    : companyId;

  const filteredTeams = effectiveCompanyId
    ? teams.filter((t) => t.companyId === parseInt(effectiveCompanyId))
    : teams;

  const selectedTeam = teams.find((t) => t.id === parseInt(teamId));
  const filteredAgents = selectedTeam?.users ?? [];

  // Calculate available amounts — safe parse to avoid NaN comparisons
  const parsedCompanyId = effectiveCompanyId
    ? parseInt(effectiveCompanyId)
    : null;
  const parsedTeamId = teamId ? parseInt(teamId) : null;
  const parsedUserId = userId ? parseInt(userId) : null;

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

  const currentAmount = parseFloat(amount) || 0;

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
    setAmount("");
    setError(null);
    setSuccess(null);
    setTeamId("");
    setUserId("");
    setCompanyId("");
    setScope("company");
  }, [open]);

  async function handleSave() {
    setError(null);
    if (!amount || parseFloat(amount) <= 0) {
      setError("Ingresa un monto válido");
      return;
    }

    // For supervisor, companyId is always their own
    const resolvedCompanyId = isSupervisor ? String(userCompanyId) : companyId;

    if (scope === "company" && !resolvedCompanyId) {
      setError("Selecciona una franquicia");
      return;
    }
    if (scope === "team" && !teamId) {
      setError("Selecciona un equipo");
      return;
    }
    if (scope === "user" && !userId) {
      setError("Selecciona un asesor");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          quincena,
          amount: parseFloat(amount),
          companyId:
            scope === "company" ? parseInt(resolvedCompanyId) : undefined,
          teamId: scope === "team" ? parseInt(teamId) : undefined,
          userId: scope === "user" ? parseInt(userId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      onSave();
      // Advance to next scope automatically
      if (scope === "company") {
        setSuccess(
          "Meta de franquicia guardada. Ahora asigna la meta del equipo.",
        );
        setScope("team");
        setAmount("");
        setError(null);
        setTeamId("");
        setUserId("");
      } else if (scope === "team") {
        setSuccess("Meta de equipo guardada. Ahora asigna la meta del asesor.");
        setScope("user");
        setAmount("");
        setError(null);
        setUserId("");
      } else {
        onClose();
      }
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
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
      <div className="bg-[#1a1c27] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4">
          Nueva meta quincenal
        </h2>

        {/* Scope selector */}
        <div className="flex gap-2 mb-4">
          {scopeOptions.map((s) => (
            <button
              key={s}
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

        <div className="space-y-3">
          {/* Franquicia: ADMIN elige, SUPERVISOR ve la suya fija */}
          {scope === "company" && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                Franquicia
              </label>
              {isAdmin ? (
                <CustomSelect
                  name="company"
                  value={companyId}
                  onChange={setCompanyId}
                  options={["", ...companies.map((c) => String(c.id))]}
                  labels={["Seleccionar...", ...companies.map((c) => c.name)]}
                  searchable={companies.length > 5}
                />
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
              <CustomSelect
                name="company"
                value={companyId}
                onChange={(v) => {
                  setCompanyId(v);
                  setTeamId("");
                  setUserId("");
                }}
                options={["", ...companies.map((c) => String(c.id))]}
                labels={["Seleccionar...", ...companies.map((c) => c.name)]}
                searchable={companies.length > 5}
              />
            </div>
          )}

          {/* Team selector */}
          {(scope === "team" || scope === "user") && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                Equipo
              </label>
              <CustomSelect
                name="team"
                value={teamId}
                onChange={(v) => {
                  setTeamId(v);
                  setUserId("");
                }}
                options={["", ...filteredTeams.map((t) => String(t.id))]}
                labels={["Seleccionar...", ...filteredTeams.map((t) => t.name)]}
              />
            </div>
          )}

          {/* Agent selector */}
          {scope === "user" && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">
                Asesor
              </label>
              <CustomSelect
                name="agent"
                value={userId}
                onChange={setUserId}
                options={["", ...filteredAgents.map((a) => String(a.id))]}
                labels={[
                  "Seleccionar...",
                  ...filteredAgents.map((a) => a.name),
                ]}
                searchable={filteredAgents.length > 5}
              />
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
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

        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-800 rounded-lg px-3 py-2">
            ✓ {success}
          </p>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar meta"}
          </button>
        </div>
      </div>
    </div>
  );
}
