"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, LeadFormData } from "@/lib/validations/lead";
import { X } from "lucide-react";
import { STATUS } from "@/utils/constants/leads";
import { CustomSelect } from "../ui/Select";

interface Props {
  onClose: () => void;
  onSave: () => void;
}

const fields = [
  { label: "Nombres", name: "firstName", type: "text", required: true },
  { label: "Apellidos", name: "lastName", type: "text", required: false },
  { label: "Teléfono 1", name: "phone1", type: "tel", required: true },
  { label: "Teléfono 2", name: "phone2", type: "tel", required: false },
  { label: "Seguridad Social", name: "ssn", type: "text", required: false },
  { label: "Dirección", name: "address", type: "text", required: false },
  { label: "Ciudad", name: "city", type: "text", required: false },
  { label: "Estado", name: "status", type: "select", required: false },
  { label: "Código Postal", name: "zipCode", type: "text", required: false },
  { label: "Email", name: "email", type: "email", required: false },
  {
    label: "Fecha de nacimiento",
    name: "birthDate",
    type: "date",
    required: false,
  },
  {
    label: "Hora de contacto",
    name: "contactTime",
    type: "time",
    required: false,
  },
];
const statusOptions = Object.keys(STATUS);
const statusLabels = Object.values(STATUS);

export function LeadModal({ onClose, onSave }: Props) {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      status: "newLead",
    },
  });

  async function onSubmit(data: LeadFormData) {
    setServerError("");

    const res = await fetch("/api/leads", {
      method: "POST",
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
      <div className="bg-[#13151c] border border-white/10 rounded-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Nuevo Lead</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {serverError && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg mb-4">
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => {
              console.log("field", field);
              if (field.type === "select" && field.name === "status") {
                return (
                  <Controller
                    key={field.name}
                    name="status"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">
                          {field.label}
                        </label>

                        <CustomSelect
                          name="status"
                          value={STATUS[value as keyof typeof STATUS]}
                          onChange={onChange}
                          options={statusOptions}
                          labels={statusLabels}
                          searchable
                        />

                        {errors.status && (
                          <p className="text-red-400 text-xs mt-1">
                            {errors.status.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                );
              }
              return (
                <div key={field.name}>
                  <label className="text-xs text-white/40 mb-1 block">
                    {field.label}
                    {field.required && (
                      <span className="text-red-400 ml-1">*</span>
                    )}
                  </label>
                  <input
                    type={field.type}
                    {...register(field.name as keyof LeadFormData)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                  />
                  {errors[field.name as keyof LeadFormData] && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors[field.name as keyof LeadFormData]?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
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
            {isSubmitting ? "Guardando..." : "Crear Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
