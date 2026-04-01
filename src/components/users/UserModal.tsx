"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@/app/(dashboard)/users/page";
import {
  userSchema,
  createUserSchema,
  UserFormData,
} from "@/lib/validations/user";
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
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(user ? userSchema : createUserSchema),
    defaultValues: {
      username: user?.username ?? "",
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      confirmPassword: "",
      role: (user?.role as UserFormData["role"]) ?? "AGENT",
      companyId: user?.companyId ? String(user.companyId) : "",
      teamId: user?.teamId ? String(user.teamId) : "",
      active: user?.active ?? true,
    },
  });

  const companyId = watch("companyId");

  // Cargar empresas
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/company");
      setCompanies(await res.json());
    };
    load();
  }, []);

  // Cargar equipos según empresa
  useEffect(() => {
    const loadTeams = async () => {
      if (!companyId) {
        setTeams([]);
        return;
      }
      const res = await fetch(`/api/team?companyId=${companyId}`);
      setTeams(await res.json());
    };
    loadTeams();
  }, [companyId]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id.toString());

    await fetch("/api/users/avatar", { method: "POST", body: formData });
  }

  async function onSubmit(data: UserFormData) {
    setServerError("");

    const method = user ? "PATCH" : "POST";
    const url = user ? `/api/users/${user.id}` : "/api/users";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Error al guardar");
      return;
    }

    onSave();
  }

  const avatarValue = watch("name");

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
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Avatar */}
          <div className="flex justify-center">
            <label className="cursor-pointer group relative">
              <Avatar name={avatarValue} avatar={user?.avatar} size="lg" />
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

          {serverError && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              {serverError}
            </p>
          )}

          {/* Campos de texto */}
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
                disabled={field.disabled}
                {...register(field.name as keyof UserFormData)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 disabled:opacity-40"
              />
              {errors[field.name as keyof UserFormData] && (
                <p className="text-red-400 text-xs mt-1">
                  {errors[field.name as keyof UserFormData]?.message}
                </p>
              )}
            </div>
          ))}

          {/* Rol */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Rol</label>
            <CustomSelect
              name="role"
              value={watch("role")}
              onChange={(val) => setValue("role", val as UserFormData["role"])}
              options={roles}
            />
            {errors.role && (
              <p className="text-red-400 text-xs mt-1">{errors.role.message}</p>
            )}
          </div>

          {/* Empresa */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">
              Empresa <span className="text-red-400">*</span>
            </label>
            <CustomSelect
              name="companyId"
              value={
                companies.find((c) => String(c.id) === companyId)?.name ??
                "Seleccionar empresa"
              }
              onChange={(val) => {
                setValue("companyId", val);
                setValue("teamId", "");
              }}
              options={["", ...companies.map((c) => String(c.id))]}
              labels={["Seleccionar empresa", ...companies.map((c) => c.name)]}
            />
            {errors.companyId && (
              <p className="text-red-400 text-xs mt-1">
                {errors.companyId.message}
              </p>
            )}
          </div>

          {/* Equipo */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">
              Equipo <span className="text-red-400">*</span>
            </label>
            <CustomSelect
              name="teamId"
              value={
                teams.find((t) => String(t.id) === watch("teamId"))?.name ??
                "Seleccionar equipo"
              }
              onChange={(val) => setValue("teamId", val)}
              options={["", ...teams.map((t) => String(t.id))]}
              labels={["Seleccionar equipo", ...teams.map((t) => t.name)]}
            />
            {errors.teamId && (
              <p className="text-red-400 text-xs mt-1">
                {errors.teamId.message}
              </p>
            )}
          </div>

          {/* Activo */}
          {user && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                {...register("active")}
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
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
