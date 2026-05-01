"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useState } from "react";
import { CompanyGoals } from "@/utils/interfaces/companies";

const schema = z.object({
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  company: CompanyGoals | null;
  onClose: () => void;
  onSave: () => void;
}

export function CompanyModal({ company, onClose, onSave }: Props) {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? "",
      active: company?.active ?? true,
    },
  });

  async function onSubmit(data: FormData) {
    setServerError("");
    const method = company ? "PATCH" : "POST";
    const url = company ? `/api/companies/${company.id}` : "/api/companies";

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#13151c] border border-white/10 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">
            {company ? "Editar Franquicia" : "Nueva Franquicia"}
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
            <label className="text-sm text-white/40 mb-1 block">Nombre</label>
            <input
              {...register("name")}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {company && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                {...register("active")}
                className="accent-cyan-500"
              />
              <label htmlFor="active" className="text-lg text-white/70">
                Empresa activa
              </label>
            </div>
          )}
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
