"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useSearchParams } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Plus, Search } from "lucide-react";
import dynamic from "next/dynamic";

const CompanyModal = dynamic(
  () => import("@/components/companies/CompanyModal").then((m) => m.CompanyModal),
  { ssr: false },
);
const TeamModal = dynamic(
  () => import("@/components/companies/TeamModal").then((m) => m.TeamModal),
  { ssr: false },
);
import { CustomSelect } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { CompanyRow } from "@/components/companies/CompanyRow";
import { CompanyGoals, Team } from "@/utils/interfaces/companies";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirmToast";

const ID_PATTERN = /^\d+$/;

export default function CompaniesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompaniesPageContent />
    </Suspense>
  );
}

function CompaniesPageContent() {
  usePageTitle("Franquicias y Equipos");
  const searchParams = useSearchParams();
  const rawOpen = searchParams.get("open") ?? "";
  const openId = ID_PATTERN.test(rawOpen) ? Number(rawOpen) : null;
  const [expanded, setExpanded] = useState<number[]>(
    openId !== null ? [openId] : [],
  );
  const scrolledToOpen = useRef(false);
  const [companyModal, setCompanyModal] = useState<{
    open: boolean;
    company: CompanyGoals | null;
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

  const { data: companies = [], isLoading, mutate } = useSWR<CompanyGoals[]>(
    "/api/companies",
    fetcher,
  );
  const { mutate: mutateKey } = useSWRConfig();

  const [openChecked, setOpenChecked] = useState(false);
  if (!openChecked && !isLoading && openId !== null) {
    setOpenChecked(true);
    if (!companies.some((c) => c.id === openId)) {
      setExpanded((prev) => prev.filter((id) => id !== openId));
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleDeleteCompany(id: number) {
    confirmToast("¿Eliminar esta franquicia? Se eliminarán todos sus equipos.", async () => {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Error al eliminar franquicia");
        return;
      }
      toast.success("Franquicia eliminada");
      void mutate();
    });
  }

  const filtered = useMemo(
    () =>
      companies.filter((company) => {
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
      }),
    [companies, search, filterActive],
  );

  useEffect(() => {
    if (scrolledToOpen.current || openId === null || isLoading) return;
    if (!filtered.some((c) => c.id === openId)) return;
    scrolledToOpen.current = true;
    document
      .getElementById(`company-row-${openId}`)
      ?.scrollIntoView({ block: "center" });
  }, [openId, isLoading, filtered]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
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

      {/* Buscador y filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
          <Search size={16} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            placeholder="Buscar franquicia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-lg text-white/70 placeholder:text-on-surface-variant outline-none w-full"
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

      {/* Lista acordeón */}
      <div className="space-y-2">
        {filtered.map((company) => (
          <CompanyRow
            key={company.id}
            company={company}
            isOpen={expanded.includes(company.id)}
            onToggle={() => toggleExpand(company.id)}
            onEdit={() => setCompanyModal({ open: true, company })}
            onDelete={() => handleDeleteCompany(company.id)}
            onEditTeam={(team) =>
              setTeamModal({ open: true, team, companyId: company.id })
            }
            onNewTeam={() =>
              setTeamModal({ open: true, team: null, companyId: company.id })
            }
          />
        ))}

        {companies.length === 0 && (
          <div className="text-center py-12 text-white/90 text-lg">
            No hay franquicias registradas
          </div>
        )}

        {companies.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-white/90 text-lg">
              Ninguna franquicia coincide con la búsqueda
            </p>
            <button
              onClick={() => {
                setSearch("");
                setFilterActive("all");
              }}
              className="text-primary hover:text-primary/80 text-lg transition-colors"
            >
              Limpiar filtros
            </button>
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
            void mutate();
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
          onSave={() => {
            const companyId = teamModal.companyId;
            setTeamModal({ open: false, team: null, companyId: null });
            if (companyId) {
              void mutateKey(`/api/teams?companyId=${companyId}`);
              void mutate();
            }
          }}
        />
      )}
    </div>
  );
}
