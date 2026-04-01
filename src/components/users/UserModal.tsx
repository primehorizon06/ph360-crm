"use client";

import { useEffect, useState } from "react";
import { User } from "@/app/(dashboard)/users/page";
import { X, Camera } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { CustomSelect } from "../ui/Select";

interface Props {
  user: User | null;
  onClose: () => void;
  onSave: () => void;
}

const roles = ["ADMIN", "SUPERVISOR", "COACH", "AGENT"];

export function UserModal({ user, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    username: user?.username ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "AGENT",
    active: user?.active ?? true,
    avatar: user?.avatar ?? "",
    confirmPassword: "",
    companyId: user?.companyId ? String(user.companyId) : "",
    teamId: user?.teamId ? String(user.teamId) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [companiesRes, teamsRes] = await Promise.all([
        fetch("/api/company"),
        fetch("/api/team"),
      ]);
      setCompanies(await companiesRes.json());
      setTeams(await teamsRes.json());
    };
    load();
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id.toString());

    const res = await fetch("/api/users/avatar", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.url) setForm((prev) => ({ ...prev, avatar: data.url }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit() {
    setError("");

    if (form.password && form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);

    const method = user ? "PATCH" : "POST";
    const url = user ? `/api/users/${user.id}` : "/api/users";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
    } else {
      onSave();
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#13151c] border border-white/10 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">
            {user ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <label className="cursor-pointer group relative">
              <Avatar name={form.name} avatar={form.avatar} size="lg" />
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {[
            {
              label: "Usuario",
              name: "username",
              type: "text",
              disabled: !!user,
            },
            { label: "Nombre completo", name: "name", type: "text" },
            { label: "Email (opcional)", name: "email", type: "email" },
            {
              label: user
                ? "Nueva contraseña (dejar vacío para no cambiar)"
                : "Contraseña",
              name: "password",
              type: "password",
            },
            {
              label: "Confirmar contraseña",
              name: "confirmPassword",
              type: "password",
            },
          ].map((field) => (
            <div key={field.name}>
              <label className="text-xs text-white/40 mb-1 block">
                {field.label}
              </label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name as keyof typeof form] as string}
                onChange={handleChange}
                disabled={field.disabled}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 disabled:opacity-40"
              />
            </div>
          ))}

          <div>
            <label className="text-xs text-white/40 mb-1 block">Rol</label>
            <CustomSelect
              name="role"
              value={form.role}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, role: value }))
              }
              options={roles}
            />
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">
              Empresa <span className="text-red-400">*</span>
            </label>
            <CustomSelect
              name="companyId"
              value={
                companies.find((c) => String(c.id) === form.companyId)?.name ??
                "Seleccionar empresa"
              }
              onChange={(val) =>
                setForm((prev) => ({ ...prev, companyId: val }))
              }
              options={["", ...companies.map((c) => String(c.id))]}
              labels={["Seleccionar empresa", ...companies.map((c) => c.name)]}
            />
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">
              Equipo <span className="text-red-400">*</span>
            </label>
            <CustomSelect
              name="teamId"
              value={
                teams.find((t) => String(t.id) === form.teamId)?.name ??
                "Seleccionar equipo"
              }
              onChange={(val) => setForm((prev) => ({ ...prev, teamId: val }))}
              options={["", ...teams.map((t) => String(t.id))]}
              labels={["Seleccionar equipo", ...teams.map((t) => t.name)]}
            />
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="active"
                id="active"
                checked={form.active}
                onChange={handleChange}
                className="accent-cyan-500"
              />
              <label htmlFor="active" className="text-sm text-white/70">
                Usuario activo
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
