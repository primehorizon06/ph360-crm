"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useState } from "react";
import { TeamModalProps } from "@/utils/interfaces/companies";
import { schemaTeams } from "@/lib/validations/teams";
import z from "zod";

export function TeamModal({
  team,
  companyId,
  onClose,
  onSave,
}: TeamModalProps) {
  const [serverError, setServerError] = useState("");

  type FormData = z.infer<typeof schemaTeams>;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schemaTeams),
    defaultValues: { name: team?.name ?? "" },
  });

  async function onSubmit(data: FormData) {
    setServerError("");
    const method = team ? "PATCH" : "POST";
    const url = team ? `/api/teams/${team.id}` : "/api/teams";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, companyId }),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Error al guardar");
      return;
    }
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#13151c] border border-white/10 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">
            {team ? "Editar Equipo" : "Nuevo Equipo"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {serverError && (
            <p className="text-red-400 text-lg bg-red-500/10 px-3 py-2 rounded-lg">
              {serverError}
            </p>
          )}

          <div>
            <label className="text-sm text-white/40 mb-1 block">
              Nombre del equipo
            </label>
            <input
              {...register("name")}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-lg text-white/50 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
