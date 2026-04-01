"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import { UserTable } from "@/components/users/UserTable";
import { UserModal } from "@/components/users/UserModal";
import { Plus } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="text-white/40 text-sm mt-1">
            {users.length} usuarios registrados
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla */}
      <UserTable users={users} onEdit={handleEdit} onDelete={handleDelete} />

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
