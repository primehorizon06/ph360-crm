"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, LeadFormData } from "@/lib/validations/lead";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { CustomSelect } from "../ui/Select";
import { Props } from "@/utils/interfaces/leadEditModal";
import { CUSTOMER_STATUS, LEAD_FIELDS, STATUS } from "@/utils/constants/leads";
import { formatPhone } from "@/utils/helpers/format";

export function LeadEditModal({ lead, onClose, onSave, type = "lead" }: Props) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const isCustomer = type === "customer";
  const [serverError, setServerError] = useState("");
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: lead.firstName,
      lastName: lead.lastName ?? "",
      phone1: lead.phone1,
      phone2: lead.phone2 ?? "",
      ssn: lead.ssn ?? "",
      address: lead.address ?? "",
      city: lead.city ?? "",
      state: lead.state ?? "",
      zipCode: lead.zipCode ?? "",
      email: lead.email ?? "",
      birthDate: lead.birthDate ? lead.birthDate.split("T")[0] : "",
      contactTime: lead.contactTime ?? "",
    },
  });

  const ssnValue = watch("ssn") ?? "";
  const phone1Value = watch("phone1") ?? "";
  const phone2Value = watch("phone2") ?? "";

  const [status, setStatus] = useState(lead.status);
  const [customerStatus, setCustomerStatus] = useState(
    lead.customerStatus ?? "",
  );
  const [companyId, setCompanyId] = useState(String(lead.companyId));
  const [teamId, setTeamId] = useState(String(lead.teamId));
  const [assignedToId, setAssignedToId] = useState(String(lead.assignedTo.id));

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/companies?simple=true")
      .then((r) => r.json())
      .then(setCompanies);
  }, [isAdmin]);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/teams?companyId=${companyId}`)
      .then((r) => r.json())
      .then(setTeams);
  }, [companyId]);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/users?teamId=${teamId}&role=AGENT`)
      .then((r) => r.json())
      .then(setAgents);
  }, [teamId]);

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
    setServerError("");
    const body = isCustomer
      ? { ...data, customerStatus, companyId, teamId, assignedToId }
      : { ...data, status, companyId, teamId, assignedToId };

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">
            {isCustomer ? "Editar Cliente" : "Editar Lead"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {serverError && (
            <p className="text-red-400 text-lg bg-red-500/10 px-3 py-2 rounded-lg">
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* phone1 — editable solo para admin, readonly para el resto */}
            {isAdmin ? (
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
                  onChange={(e) =>
                    setValue("phone1", formatPhone(e.target.value), {
                      shouldValidate: true,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50 tracking-widest"
                />
                {errors.phone1 && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.phone1.message}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="text-sm text-white/40 mb-1 block">
                  Teléfono 1
                </label>
                <input
                  type="tel"
                  value={lead.phone1}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white/30 outline-none cursor-not-allowed"
                />
              </div>
            )}

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
                onChange={(e) =>
                  setValue("phone2", formatPhone(e.target.value), {
                    shouldValidate: true,
                  })
                }
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

            {/* Estado */}
            <div>
              <label className="text-sm text-white/40 mb-1 block">Estado</label>
              {isCustomer ? (
                <CustomSelect
                  name="customerStatus"
                  value={CUSTOMER_STATUS[customerStatus] ?? "Seleccionar"}
                  onChange={setCustomerStatus}
                  options={Object.keys(CUSTOMER_STATUS)}
                  labels={Object.values(CUSTOMER_STATUS)}
                />
              ) : (
                <CustomSelect
                  name="status"
                  value={STATUS[status]}
                  onChange={setStatus}
                  options={Object.keys(STATUS)}
                  labels={Object.values(STATUS)}
                />
              )}
            </div>

            {/* Franquicia — solo ADMIN */}
            {isAdmin && (
              <div>
                <label className="text-sm text-white/40 mb-1 block">
                  Franquicia
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
            )}

            {/* Equipo */}
            {(isAdmin || role === "SUPERVISOR" || role === "COACH") && (
              <div>
                <label className="text-sm text-white/40 mb-1 block">
                  Equipo
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
            )}

            {/* Agente */}
            {(isAdmin || role === "SUPERVISOR" || role === "COACH") && (
              <div>
                <label className="text-sm text-white/40 mb-1 block">
                  Agente asignado
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
