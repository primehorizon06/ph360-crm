"use client";

import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { CompanyGoals, Team } from "@/utils/interfaces/companies";
import { fetcher } from "@/lib/fetcher";
import { confirmToast } from "@/lib/confirmToast";

interface Props {
  company: CompanyGoals;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditTeam: (team: Team) => void;
  onNewTeam: () => void;
}

const LINK_CLASS = "hover:text-primary hover:underline underline-offset-4";

export function CompanyRow({
  company,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onEditTeam,
  onNewTeam,
}: Props) {
  const teamsKey = `/api/teams?companyId=${company.id}`;
  const { data: teams = [], isLoading } = useSWR<Team[]>(
    isOpen ? teamsKey : null,
    fetcher,
  );
  const { mutate } = useSWRConfig();
  const panelId = `company-${company.id}-teams`;
  const loadingTeams = isOpen && isLoading;

  function handleDeleteTeam(team: Team) {
    confirmToast("¿Eliminar este equipo?", async () => {
      const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Error al eliminar equipo");
        return;
      }
      toast.success("Equipo eliminado");
      void mutate(teamsKey);
      void mutate("/api/companies");
    });
  }

  return (
    <div
      id={`company-row-${company.id}`}
      className="bg-surface border border-white/10 rounded-xl overflow-hidden"
    >
      {/* Franquicia */}
      <div className="flex items-start justify-between px-4 py-3 gap-2">
        <div className="flex-1 min-w-0">
          <button
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="flex items-start gap-3 w-full text-left min-w-0"
          >
            {loadingTeams ? (
              <Loader2
                size={16}
                className="text-primary mt-0.5 shrink-0 animate-spin"
                aria-hidden
              />
            ) : isOpen ? (
              <ChevronDown
                size={16}
                className="text-primary mt-0.5 shrink-0"
                aria-hidden
              />
            ) : (
              <ChevronRight
                size={16}
                className="text-on-surface-variant mt-0.5 shrink-0"
                aria-hidden
              />
            )}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Avatar name={company.name} avatar={company.logo} size="sm" />
              <p className="text-white font-medium truncate">{company.name}</p>
              <span
                className={`text-sm px-2 py-0.5 rounded-full shrink-0 ${company.active ? "bg-success/20 text-success" : "bg-error/20 text-error"}`}
              >
                {company.active ? "Activa" : "Inactiva"}
              </span>
            </div>
          </button>
          <p className="text-on-surface-variant text-sm mt-0.5 pl-7">
            {company._count.teams} equipos ·{" "}
            <Link
              href={`/users?companyId=${company.id}`}
              aria-label={`Ver los ${company._count.users} usuarios de ${company.name}`}
              className={LINK_CLASS}
            >
              {company._count.users} usuarios
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            aria-label={`Editar franquicia ${company.name}`}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
          >
            <Pencil size={14} aria-hidden />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Eliminar franquicia ${company.name}`}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      </div>

      {/* Equipos */}
      {isOpen && (
        <div
          id={panelId}
          aria-busy={loadingTeams}
          className="border-t border-white/5 px-4 py-3 space-y-2"
        >
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Users size={14} className="text-on-surface-variant" aria-hidden />
                <span className="text-lg text-white/70">{team.name}</span>
                <Link
                  href={`/users?companyId=${company.id}&teamId=${team.id}`}
                  aria-label={`Ver los ${team._count.users} usuarios del equipo ${team.name}`}
                  className={`text-sm text-white/90 ${LINK_CLASS}`}
                >
                  {team._count.users} usuarios
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditTeam(team)}
                  aria-label={`Editar equipo ${team.name}`}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  onClick={() => handleDeleteTeam(team)}
                  aria-label={`Eliminar equipo ${team.name}`}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={onNewTeam}
            className="flex items-center gap-2 text-primary hover:text-primary/80 text-lg transition-colors mt-1"
          >
            <Plus size={14} aria-hidden />
            Nuevo equipo
          </button>
        </div>
      )}
    </div>
  );
}
