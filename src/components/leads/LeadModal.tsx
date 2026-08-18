"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { leadSchema, LeadFormData } from "@/lib/validations/lead";
import { X } from "lucide-react";
import { LEAD_FIELDS, STATUS } from "@/utils/constants/leads";
import { CustomSelect } from "../ui/Select";
import { formatPhone } from "@/utils/helpers/format";
import { UserRole } from "@/utils/constants/roles";
import { fetcher } from "@/lib/fetcher";

interface Props {
  onClose: () => void;
  onSave: () => void;
}

const statusOptions = Object.keys(STATUS);
const statusLabels = Object.values(STATUS);

export function LeadModal({ onClose, onSave }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === UserRole.ADMIN;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "newLead", ssn: "" },
  });

  const ssnValue = watch("ssn") ?? "";
  const phone1Value = watch("phone1") ?? "";
  const phone2Value = watch("phone2") ?? "";

  const [companyId, setCompanyId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  const { data: companies = [] } = useSWR<{ id: number; name: string }[]>(
    isAdmin ? "/api/companies?simple=true" : null,
    fetcher,
  );
  const { data: teams = [] } = useSWR<{ id: number; name: string }[]>(
    isAdmin && companyId ? `/api/teams?companyId=${companyId}` : null,
    fetcher,
  );
  const { data: agents = [] } = useSWR<{ id: number; name: string }[]>(
    isAdmin && teamId ? `/api/users?teamId=${teamId}&role=AGENT` : null,
    fetcher,
  );

  function handleSsnChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
    let masked = digits;
    if (digits.length > 5)
      masked = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    else if (digits.length > 3)
      masked = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    setValue("ssn", masked, { shouldValidate: true });
  }

  async function onSubmit(data: LeadFormData) {
    if (isAdmin && (!companyId || !teamId || !assignedToId)) {
      toast.error("Selecciona franquicia, equipo y agente asignado");
      return;
    }

    const body = isAdmin ? { ...data, companyId, teamId, assignedToId } : data;

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Error al guardar");
      return;
    }
    toast.success("Lead creado exitosamente");
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#13151c] border border-white/10 rounded-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Nuevo Lead</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/40 mb-1 block">
                Teléfono 1 <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(000) 000-0000"
                maxLength={14}
                value={phone1Value}
                onChange={(e) => setValue("phone1", formatPhone(e.target.value), { shouldValidate: true })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50 tracking-widest"
              />
              {errors.phone1 && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.phone1.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">
                Teléfono 2
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="(000) 000-0000"
                maxLength={14}
                value={phone2Value}
                onChange={(e) => setValue("phone2", formatPhone(e.target.value), { shouldValidate: true })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50 tracking-widest"
              />
              {errors.phone2 && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.phone2.message}
                </p>
              )}
            </div>

            {/* SSN con máscara */}
            <div>
              <label className="text-sm text-white/40 mb-1 block">
                Seguro Social
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000-00-0000"
                maxLength={11}
                value={ssnValue}
                onChange={handleSsnChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50 tracking-widest"
              />
              {errors.ssn && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.ssn.message}
                </p>
              )}
            </div>

            {/* Campos base compartidos */}
            {LEAD_FIELDS.map((field) => (
              <div key={field.name}>
                <label className="text-sm text-white/40 mb-1 block">
                  {field.label}
                  {field.required && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </label>
                <input
                  type={field.type}
                  {...register(field.name as keyof LeadFormData)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50"
                />
                {errors[field.name as keyof LeadFormData] && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors[field.name as keyof LeadFormData]?.message}
                  </p>
                )}
              </div>
            ))}

            {isAdmin && (
              <>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">
                    Franquicia <span className="text-red-400">*</span>
                  </label>
                  <CustomSelect
                    name="companyId"
                    value={
                      companies.find((c) => String(c.id) === companyId)?.name ??
                      "Seleccionar"
                    }
                    onChange={(val) => {
                      setCompanyId(val);
                      setTeamId("");
                      setAssignedToId("");
                    }}
                    options={companies.map((c) => String(c.id))}
                    labels={companies.map((c) => c.name)}
                  />
                </div>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">
                    Equipo <span className="text-red-400">*</span>
                  </label>
                  <CustomSelect
                    name="teamId"
                    value={
                      teams.find((t) => String(t.id) === teamId)?.name ??
                      "Seleccionar"
                    }
                    onChange={(val) => {
                      setTeamId(val);
                      setAssignedToId("");
                    }}
                    options={teams.map((t) => String(t.id))}
                    labels={teams.map((t) => t.name)}
                  />
                </div>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">
                    Agente asignado <span className="text-red-400">*</span>
                  </label>
                  <CustomSelect
                    searchable
                    name="assignedToId"
                    value={
                      agents.find((a) => String(a.id) === assignedToId)?.name ??
                      "Seleccionar"
                    }
                    onChange={setAssignedToId}
                    options={agents.map((a) => String(a.id))}
                    labels={agents.map((a) => a.name)}
                  />
                </div>
              </>
            )}

            {/* Status */}
            <Controller
              name="status"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  <label className="text-sm text-white/40 mb-1 block">
                    Status
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
                    <p className="text-red-400 text-sm mt-1">
                      {errors.status.message}
                    </p>
                  )}
                </div>
              )}
            />
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
            {isSubmitting ? "Guardando..." : "Crear Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
