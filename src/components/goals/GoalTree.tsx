// ── Goal Tree Row ─────────────────────────────────────────────────────────────

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { Company } from "@/utils/interfaces/dashboard";
import { useState } from "react";
import { Goal } from "@/utils/interfaces/goals";
import { Team } from "@/utils/interfaces/companies";
import { fmt } from "@/utils/helpers/format";

export function GoalTree({
  goals,
  companies,
  teams,
  onDelete,
  canEdit,
}: {
  goals: Goal[];
  companies: Company[];
  teams: Team[];
  onDelete: (id: number) => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string | number, boolean>>({});

  const companyGoals = goals.filter((g) => g.companyId);
  const teamGoals = goals.filter((g) => g.teamId);
  const agentGoals = goals.filter((g) => g.userId);

  // Companies without goals
  const allCompanies = companies;

  return (
    <div className="space-y-3">
      {allCompanies.map((company) => {
        const cGoal = companyGoals.find((g) => g.companyId === company.id);
        const cTeams = teams.filter((t) => t.companyId === company.id);
        const cTeamGoals = teamGoals.filter(
          (g) => g.team?.companyId === company.id,
        );
        const teamsSum = cTeamGoals.reduce((s, g) => s + Number(g.amount), 0);
        const isExpanded = expanded[company.id] ?? true;

        return (
          <div
            key={company.id}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
          >
            {/* Company row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() =>
                  setExpanded((p) => ({ ...p, [company.id]: !isExpanded }))
                }
                className="text-white/40 hover:text-white transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {company.name}
                  </span>
                  {cGoal ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-cyan-400">
                        {fmt(Number(cGoal.amount))}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => onDelete(cGoal.id)}
                          className="text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-white/30">Sin meta</span>
                  )}
                </div>
                {cGoal && (
                  <div className="mt-1.5">
                    <ProgressBar
                      value={teamsSum}
                      max={Number(cGoal.amount)}
                      color={
                        Math.abs(teamsSum - Number(cGoal.amount)) < 0.01
                          ? "bg-emerald-500"
                          : "bg-cyan-500"
                      }
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-white/30">
                        Equipos: {fmt(teamsSum)}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {Math.abs(teamsSum - Number(cGoal.amount)) < 0.01
                          ? "✓ Completo"
                          : `Disponible: ${fmt(Number(cGoal.amount) - teamsSum)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Teams */}
            {isExpanded &&
              cTeams.map((team) => {
                const tGoal = teamGoals.find((g) => g.teamId === team.id);
                const tAgentGoals = agentGoals.filter(
                  (g) => g.user?.teamId === team.id,
                );
                const agentsSum = tAgentGoals.reduce(
                  (s, g) => s + Number(g.amount),
                  0,
                );
                const isTeamExp = expanded[`t${team.id}`] ?? true;

                return (
                  <div key={team.id} className="border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-2.5 pl-10">
                      <button
                        onClick={() =>
                          setExpanded((p) => ({
                            ...p,
                            [`t${team.id}`]: !isTeamExp,
                          }))
                        }
                        className="text-white/30 hover:text-white transition-colors"
                      >
                        {isTeamExp ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white/70">
                            {team.name}
                          </span>
                          {tGoal ? (
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-white/80">
                                {fmt(Number(tGoal.amount))}
                              </span>
                              {canEdit && (
                                <button
                                  onClick={() => onDelete(tGoal.id)}
                                  className="text-white/20 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/20">
                              Sin meta
                            </span>
                          )}
                        </div>
                        {tGoal && (
                          <div className="mt-1">
                            <ProgressBar
                              value={agentsSum}
                              max={Number(tGoal.amount)}
                              color={
                                Math.abs(agentsSum - Number(tGoal.amount)) <
                                0.01
                                  ? "bg-emerald-500"
                                  : "bg-violet-500"
                              }
                            />
                            <div className="flex justify-between mt-0.5">
                              <span className="text-[10px] text-white/20">
                                Asesores: {fmt(agentsSum)}
                              </span>
                              <span className="text-[10px] text-white/20">
                                {Math.abs(agentsSum - Number(tGoal.amount)) <
                                0.01
                                  ? "✓ Completo"
                                  : `Disponible: ${fmt(Number(tGoal.amount) - agentsSum)}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Agents */}
                    {isTeamExp &&
                      tAgentGoals.map((ag) => (
                        <div
                          key={ag.id}
                          className="flex items-center justify-between px-4 py-2 pl-20 border-t border-white/[0.03]"
                        >
                          <span className="text-xs text-white/50">
                            {ag.user?.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/60 font-medium">
                              {fmt(Number(ag.amount))}
                            </span>
                            {canEdit && (
                              <button
                                onClick={() => onDelete(ag.id)}
                                className="text-white/20 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
