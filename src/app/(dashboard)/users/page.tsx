"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import { UserTable } from "@/components/users/UserTable";
import { UserModal } from "@/components/users/UserModal";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/Select";

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/companies?simple=true");
      setCompanies(await res.json());
    };
    load();
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      if (!filterCompany) {
        setTeams([]);
        setFilterTeam("");
        return;
      }
      const res = await fetch(`/api/teams?companyId=${filterCompany}`);
      setTeams(await res.json());
    };
    loadTeams();
  }, [filterCompany]);

  const filtered = users.filter((user) => {
    const matchSearch = `${user.name} ${user.username}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchCompany =
      !filterCompany || String(user.companyId) === filterCompany;
    const matchTeam = !filterTeam || String(user.teamId) === filterTeam;
    return matchSearch && matchCompany && matchTeam;
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session.user.role !== "ADMIN")
      router.push("/");
  }, [status, session, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadUsers();
  }, [status, loadUsers]);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este usuario?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  }

  function handleEdit(user: User) {
    setEditingUser(user);
    setModalOpen(true);
  }

  function handleNew() {
    setEditingUser(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setModalOpen(false);
    loadUsers();
  }

  if (status === "loading" || loading) return <Loading />;

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
            className="bg-transparent text-sm text-white/70 placeholder:text-white/30 outline-none w-full"
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
