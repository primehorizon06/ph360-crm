"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Camera } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CompanyGoals } from "@/utils/interfaces/companies";
import { Avatar } from "@/components/ui/Avatar";

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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? "",
      active: company?.active ?? true,
    },
  });

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    const formData = new FormData();
    formData.append("file", file);

    await fetch(`/api/companies/${company.id}/logo`, {
      method: "POST",
      body: formData,
    });
  }

  async function onSubmit(data: FormData) {
    const method = company ? "PATCH" : "POST";
    const url = company ? `/api/companies/${company.id}` : "/api/companies";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Error al guardar");
      return;
    }
    toast.success(company ? "Franquicia actualizada" : "Franquicia creada");
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">
            {company ? "Editar Franquicia" : "Nueva Franquicia"}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {company && (
            <div className="flex justify-center">
              <label className="cursor-pointer group relative">
                <Avatar name={watch("name")} avatar={company.logo} size="lg" />
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
          )}

          <div>
            <label className="text-sm text-on-surface-variant mb-1 block">Nombre</label>
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
                Franquicia activa
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-lg text-white/90 hover:text-white transition-colors"
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
