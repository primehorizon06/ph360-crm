"use client";

import { useCallback, useEffect, useState } from "react";
import { Loading } from "@/components/ui/Loading";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Search,
} from "lucide-react";
import { CompanyModal } from "@/components/companies/CompanyModal";
import { TeamModal } from "@/components/companies/TeamModal";
import { CustomSelect } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";

interface Team {
  id: number;
  name: string;
  companyId: number;
  _count: { users: number };
}

interface Company {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  _count: { teams: number; users: number };
  teams?: Team[];
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [companyModal, setCompanyModal] = useState<{
    open: boolean;
    company: Company | null;
  }>({ open: false, company: null });
  const [teamModal, setTeamModal] = useState<{
    open: boolean;
    team: Team | null;
    companyId: number | null;
  }>({ open: false, team: null, companyId: null });
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");

  useEffect(() => {
    const loadCompanies = async () => {
      setLoading(true);
      const res = await fetch("/api/companies");
      setCompanies(await res.json());
      setLoading(false);
    };
    loadCompanies();
  }, []);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/companies");
    setCompanies(await res.json());
    setLoading(false);
  }, []);

  async function toggleExpand(company: Company) {
    if (expanded.includes(company.id)) {
      setExpanded((prev) => prev.filter((id) => id !== company.id));
      return;
    }

    // Cargar equipos de la empresa
    const res = await fetch(`/api/teams?companyId=${company.id}`);
    const teams = await res.json();
    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? { ...c, teams } : c)),
    );
    setExpanded((prev) => [...prev, company.id]);
  }

  async function handleDeleteCompany(id: number) {
    if (!confirm("¿Eliminar esta franquicia? Se eliminarán todos sus equipos."))
      return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    loadCompanies();
  }

  async function handleDeleteTeam(id: number, companyId: number) {
    if (!confirm("¿Eliminar este equipo?")) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    const res = await fetch(`/api/teams?companyId=${companyId}`);
    const teams = await res.json();
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, teams } : c)),
    );
  }

  // Filtrar companies
  const filtered = companies.filter((company) => {
    const matchSearch = company.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchActive =
      filterActive === "all"
        ? true
        : filterActive === "active"
          ? company.active
          : !company.active;
    return matchSearch && matchActive;
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Buscador y filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            type="text"
            placeholder="Buscar franquicia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-lg text-white/70 placeholder:text-white/30 outline-none w-full"
          />
        </div>
        <CustomSelect
          name="filter"
          value={
            filterActive === "all"
              ? "Todas"
              : filterActive === "active"
                ? "Activas"
                : "Inactivas"
          }
          onChange={(val) =>
            setFilterActive(val as "all" | "active" | "inactive")
          }
          options={["all", "active", "inactive"]}
          labels={["Todas", "Activas", "Inactivas"]}
        />
      </div>
      {/* Header */}
      <PageHeader
        title="Franquicias"
        description={`${filtered.length} de ${companies.length} franquicias registradas`}
        action={{
          label: "Nueva Franquicia",
          icon: Plus,
          onClick: () => setCompanyModal({ open: true, company: null }),
        }}
      />

      {/* Lista acordeón */}
      <div className="space-y-2">
        {filtered.map((company) => (
          <div
            key={company.id}
            className="bg-[#13151c] border border-white/10 rounded-xl overflow-hidden"
          >
            {/* Empresa */}
            <div className="flex items-start justify-between px-4 py-3 gap-2">
              <button
                onClick={() => toggleExpand(company)}
                className="flex items-start gap-3 flex-1 text-left min-w-0"
              >
                {expanded.includes(company.id) ? (
                  <ChevronDown
                    size={16}
                    className="text-cyan-400 mt-0.5 shrink-0"
                  />
                ) : (
                  <ChevronRight
                    size={16}
                    className="text-white/40 mt-0.5 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-white font-medium truncate">
                      {company.name}
                    </p>
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full shrink-0 ${company.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {company.active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <p className="text-white/40 text-sm mt-0.5">
                    {company._count.teams} equipos · {company._count.users}{" "}
                    usuarios
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setCompanyModal({ open: true, company })}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDeleteCompany(company.id)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Equipos */}
            {expanded.includes(company.id) && (
              <div className="border-t border-white/5 px-4 py-3 space-y-2">
                {company.teams?.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-white/40" />
                      <span className="text-lg text-white/70">{team.name}</span>
                      <span className="text-sm text-white/30">
                        {team._count.users} usuarios
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setTeamModal({
                            open: true,
                            team,
                            companyId: company.id,
                          })
                        }
                        className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id, company.id)}
                        className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setTeamModal({
                      open: true,
                      team: null,
                      companyId: company.id,
                    })
                  }
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-lg transition-colors mt-1"
                >
                  <Plus size={14} />
                  Nuevo equipo
                </button>
              </div>
            )}
          </div>
        ))}

        {companies.length === 0 && (
          <div className="text-center py-12 text-white/30 text-lg">
            No hay franquicias registradas
          </div>
        )}
      </div>

      {/* Modales */}
      {companyModal.open && (
        <CompanyModal
          key={companyModal.company?.id ?? "new"}
          company={companyModal.company}
          onClose={() => setCompanyModal({ open: false, company: null })}
          onSave={() => {
            setCompanyModal({ open: false, company: null });
            loadCompanies();
          }}
        />
      )}

      {teamModal.open && (
        <TeamModal
          key={teamModal.team?.id ?? "new-team"}
          team={teamModal.team}
          companyId={teamModal.companyId!}
          onClose={() =>
            setTeamModal({ open: false, team: null, companyId: null })
          }
          onSave={async () => {
            setTeamModal({ open: false, team: null, companyId: null });
            if (teamModal.companyId) {
              const res = await fetch(
                `/api/teams?companyId=${teamModal.companyId}`,
              );
              const teams = await res.json();
              setCompanies((prev) =>
                prev.map((c) =>
                  c.id === teamModal.companyId ? { ...c, teams } : c,
                ),
              );
            }
          }}
        />
      )}
    </div>
  );
}
