"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import dynamic from "next/dynamic";
import { UserTable } from "@/components/users/UserTable";

const UserModal = dynamic(
  () => import("@/components/users/UserModal").then((m) => m.UserModal),
  { ssr: false },
);
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";
import { UserRole } from "@/utils/constants/roles";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirmToast";

const LIMIT = 20;

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

export default function UsersPage() {
  usePageTitle("Usuarios");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [page, setPage] = useState(1);

  // Debounce búsqueda: el setState ocurre en el callback del timer, no directo en el efecto
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const usersKey = useMemo(() => {
    if (status !== "authenticated") return null;
    const params = new URLSearchParams({
      paginated: "true",
      page: String(page),
      limit: String(LIMIT),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterCompany) params.set("companyId", filterCompany);
    if (filterTeam) params.set("teamId", filterTeam);
    return `/api/users?${params}`;
  }, [status, page, debouncedSearch, filterCompany, filterTeam]);

  const teamsKey = filterCompany
    ? `/api/teams?companyId=${filterCompany}`
    : null;

  const { data, isLoading: loadingUsers, mutate: mutateUsers } =
    useSWR<UserListResponse>(usersKey, fetcher);
  const { data: companies = [] } = useSWR<{ id: number; name: string }[]>(
    "/api/companies?simple=true",
    fetcher,
  );
  const { data: teams = [] } = useSWR<{ id: number; name: string }[]>(
    teamsKey,
    fetcher,
  );

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session.user.role !== UserRole.ADMIN)
      router.push("/");
  }, [status, session, router]);

  const users = data?.data ?? [];

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

  if (status === "loading" || (loadingUsers && !data)) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Usuarios"
        description={`${data?.total ?? 0} usuarios registrados`}
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
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-lg text-white/70 placeholder:text-white/30 outline-none w-full"
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
          value={
            companies.find((c) => String(c.id) === filterCompany)?.name ??
            "Todas las franquicias"
          }
          onChange={(val) => {
            setFilterCompany(val);
            setFilterTeam("");
            setPage(1);
          }}
          options={["", ...companies.map((c) => String(c.id))]}
          labels={["Todas las franquicias", ...companies.map((c) => c.name)]}
        />

        {/* Filtro equipo */}
        <CustomSelect
          name="filterTeam"
          aria-label="Filtrar por equipo"
          value={
            teams.find((t) => String(t.id) === filterTeam)?.name ??
            "Todos los equipos"
          }
          onChange={(val) => {
            setFilterTeam(val);
            setPage(1);
          }}
          options={["", ...teams.map((t) => String(t.id))]}
          labels={["Todos los equipos", ...teams.map((t) => t.name)]}
        />
      </div>

      {/* Tabla */}
      <UserTable users={users} onEdit={handleEdit} onToggleActive={handleToggleActive} />

      {/* Paginación */}
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

      {/* Modal */}
      {modalOpen && (
        <UserModal
          key={editingUser?.id ?? "new"}
          user={editingUser}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
