"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import { UserTable } from "@/components/users/UserTable";
import { UserModal } from "@/components/users/UserModal";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";
import { UserRole } from "@/utils/constants/roles";
import { fetcher } from "@/lib/fetcher";

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

export default function UsersPage() {
  usePageTitle("Usuarios");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  const usersKey = status === "authenticated" ? "/api/users" : null;
  const teamsKey = filterCompany
    ? `/api/teams?companyId=${filterCompany}`
    : null;

  const { data: users = [], isLoading: loadingUsers, mutate: mutateUsers } =
    useSWR<User[]>(usersKey, fetcher);
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

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const matchSearch = `${user.name} ${user.username}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchCompany =
          !filterCompany || String(user.companyId) === filterCompany;
        const matchTeam = !filterTeam || String(user.teamId) === filterTeam;
        return matchSearch && matchCompany && matchTeam;
      }),
    [users, search, filterCompany, filterTeam],
  );

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este usuario?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    void mutateUsers();
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

  if (status === "loading" || loadingUsers) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Usuarios"
        description={`${filtered.length} de ${users.length} usuarios registrados`}
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
            onChange={(e) => setSearch(e.target.value)}
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
          value={
            companies.find((c) => String(c.id) === filterCompany)?.name ??
            "Todas las franquicias"
          }
          onChange={(val) => {
            setFilterCompany(val);
            setFilterTeam("");
          }}
          options={["", ...companies.map((c) => String(c.id))]}
          labels={["Todas las franquicias", ...companies.map((c) => c.name)]}
        />

        {/* Filtro equipo */}
        <CustomSelect
          name="filterTeam"
          value={
            teams.find((t) => String(t.id) === filterTeam)?.name ??
            "Todos los equipos"
          }
          onChange={(val) => setFilterTeam(val)}
          options={["", ...teams.map((t) => String(t.id))]}
          labels={["Todos los equipos", ...teams.map((t) => t.name)]}
        />
      </div>

      {/* Tabla */}
      <UserTable users={filtered} onEdit={handleEdit} onDelete={handleDelete} />

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