"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { PageSkeleton } from "@/components/ui/Skeleton";
import dynamic from "next/dynamic";
import { UserTable } from "@/components/users/UserTable";

const UserModal = dynamic(
  () => import("@/components/users/UserModal").then((m) => m.UserModal),
  { ssr: false },
);
import { Plus, Search, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";
import { UserRole } from "@/utils/constants/roles";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirmToast";
import { DEFAULT_PAGE_SIZE, Pagination } from "@/components/ui/Pagination";


export interface User {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  role: string;
  active: boolean;
  companyId?: number | null;
  teamId?: number | null;
  company?: { name: string } | null;
  team?: { name: string } | null;
  avatar?: string | null;
  createdAt?: string;
}

interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ID_PATTERN = /^\d+$/;

export default function UsersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}

function UsersPageContent() {
  usePageTitle("Usuarios");
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const urlSearch = searchParams.get("search") ?? "";
  const rawCompany = searchParams.get("companyId") ?? "";
  const rawTeam = searchParams.get("teamId") ?? "";
  const rawPage = searchParams.get("page") ?? "";
  const filterCompany = ID_PATTERN.test(rawCompany) ? rawCompany : "";
  const filterTeam =
    filterCompany && ID_PATTERN.test(rawTeam) ? rawTeam : "";
  const page =
    ID_PATTERN.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;

  const [search, setSearch] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const updateParams = useCallback(
    (changes: Record<string, string | null>, mode: "push" | "replace") => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      const url = qs ? `/users?${qs}` : "/users";
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [searchParams],
  );

  // Debounce búsqueda: la URL se actualiza en el callback del timer, no directo en el efecto
  useEffect(() => {
    if (search === urlSearch) return;
    const t = setTimeout(
      () => updateParams({ search, page: null }, "replace"),
      300,
    );
    return () => clearTimeout(t);
  }, [search, urlSearch, updateParams]);

  const teamsKey = filterCompany
    ? `/api/teams?companyId=${filterCompany}`
    : null;

  const { data: companies = [] } = useSWR<{ id: number; name: string }[]>(
    "/api/companies?simple=true",
    fetcher,
  );
  const { data: teamsData } = useSWR<{ id: number; name: string }[]>(
    teamsKey,
    fetcher,
  );
  const teams = teamsData ?? [];
  const selectedCompany = companies.find((c) => String(c.id) === filterCompany);
  const selectedTeam = teams.find((t) => String(t.id) === filterTeam);
  const effectiveTeam =
    filterTeam && (teamsData === undefined || selectedTeam) ? filterTeam : "";

  const usersKey = useMemo(() => {
    if (status !== "authenticated") return null;
    const params = new URLSearchParams({
      paginated: "true",
      page: String(page),
      limit: String(pageSize),
    });
    if (urlSearch) params.set("search", urlSearch);
    if (filterCompany) params.set("companyId", filterCompany);
    if (effectiveTeam) params.set("teamId", effectiveTeam);
    return `/api/users?${params}`;
  }, [status, page, pageSize, urlSearch, filterCompany, effectiveTeam]);

  const { data, isLoading: loadingUsers, mutate: mutateUsers } =
    useSWR<UserListResponse>(usersKey, fetcher, { keepPreviousData: true });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session.user.role !== UserRole.ADMIN)
      router.push("/");
  }, [status, session, router]);

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;
  const hasFilters = Boolean(urlSearch || filterCompany || effectiveTeam);

  const handlePageChange = useCallback(
    (p: number) =>
      updateParams(
        { page: p === 1 ? null : String(p) },
        totalPages > 0 && page > totalPages ? "replace" : "push",
      ),
    [updateParams, totalPages, page],
  );

  function clearFilters() {
    setSearch("");
    window.history.pushState(null, "", "/users");
  }

  function handleToggleActive(user: User) {
    const activating = !user.active;
    confirmToast(
      activating
        ? "¿Activar este usuario? Podrá volver a iniciar sesión."
        : "¿Desactivar este usuario? No podrá iniciar sesión mientras esté desactivado.",
      async () => {
        const res = await fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            name: user.name,
            email: user.email ?? "",
            role: user.role,
            companyId: user.companyId ? String(user.companyId) : "",
            teamId: user.teamId ? String(user.teamId) : "",
            active: activating,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error ?? "Error al actualizar usuario");
          return;
        }
        toast.success(activating ? "Usuario activado" : "Usuario desactivado");
        void mutateUsers();
      },
      activating ? "Activar" : "Desactivar",
    );
  }

  function handleEdit(user: User) {
    setEditingUser(user);
    setModalOpen(true);
  }

  function handleNew() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function handleSave() {
    setModalOpen(false);
    void mutateUsers();
  }

  if (status === "loading" || (loadingUsers && !data)) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Usuarios"
        action={{
          label: "Nuevo Usuario",
          icon: Plus,
          onClick: handleNew,
        }}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
          <Search size={16} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-lg text-white/70 placeholder:text-on-surface-variant outline-none w-full"
          />
        </div>

        {/* Separador visual */}
        <div className="hidden sm:flex items-center">
          <div className="w-px h-8 bg-white/10" />
        </div>

        {/* Filtro franquicia */}
        <CustomSelect
          name="filterCompany"
          aria-label="Filtrar por franquicia"
          value={selectedCompany?.name ?? "Todas las franquicias"}
          onChange={(val) =>
            updateParams({ companyId: val, teamId: null, page: null }, "push")
          }
          options={["", ...companies.map((c) => String(c.id))]}
          labels={["Todas las franquicias", ...companies.map((c) => c.name)]}
        />

        {/* Filtro equipo */}
        <CustomSelect
          name="filterTeam"
          aria-label="Filtrar por equipo"
          value={selectedTeam?.name ?? "Todos los equipos"}
          onChange={(val) => updateParams({ teamId: val, page: null }, "push")}
          options={["", ...teams.map((t) => String(t.id))]}
          labels={["Todos los equipos", ...teams.map((t) => t.name)]}
        />
      </div>

      {selectedCompany && (
        <div>
          <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/15 border border-primary/30 text-on-surface text-sm pl-3 pr-1 py-1">
            <span className="truncate">
              {selectedCompany.name}
              {selectedTeam ? ` · ${selectedTeam.name}` : ""}
            </span>
            <button
              onClick={() =>
                updateParams(
                  { companyId: null, teamId: null, page: null },
                  "push",
                )
              }
              aria-label="Quitar filtro de franquicia y equipo"
              className="shrink-0 p-1 rounded-full hover:bg-primary/20 transition-colors"
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        </div>
      )}

      {/* Tabla */}
      <UserTable
        users={users}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        emptyState={
          hasFilters ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-white/90 text-lg">
                Ningún usuario coincide con los filtros
              </p>
              <button
                onClick={clearFilters}
                className="text-primary hover:text-primary/80 text-lg transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : undefined
        }
        footer={
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            totalPages={totalPages}
            itemLabel={{ singular: "usuario", plural: "usuarios" }}
            onPageChange={handlePageChange}
            onPageSizeChange={(size) => {
              setPageSize(size);
              updateParams({ page: null }, "replace");
            }}
          />
        }
      />

      {/* Modal */}
      {modalOpen && (
        <UserModal
          key={editingUser?.id ?? "new"}
          user={editingUser}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          defaults={
            editingUser
              ? undefined
              : {
                  companyId: selectedCompany ? filterCompany : "",
                  teamId: selectedTeam ? filterTeam : "",
                }
          }
        />
      )}
    </div>
  );
}
