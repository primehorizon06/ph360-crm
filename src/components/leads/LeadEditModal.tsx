"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, LeadFormData } from "@/lib/validations/lead";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { CustomSelect } from "../ui/Select";
import { Props } from "@/utils/interfaces/leadEditModal";
import { STATUS } from "@/utils/constants/leads";

export function LeadEditModal({ lead, onClose, onSave }: Props) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [serverError, setServerError] = useState("");
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);

  const {
    register,
    handleSubmit,
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

  const [status, setStatus] = useState(lead.status);
  const [companyId, setCompanyId] = useState(String(lead.companyId));
  const [teamId, setTeamId] = useState(String(lead.teamId));
  const [assignedToId, setAssignedToId] = useState(String(lead.assignedTo.id));

  // Cargar empresas (solo admin)
  useEffect(() => {
    if (role !== "ADMIN") return;
    const load = async () => {
      const res = await fetch("/api/companies?simple=true");
      setCompanies(await res.json());
    };
    load();
  }, [role]);

  // Cargar equipos según franquicia
  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      const res = await fetch(`/api/teams?companyId=${companyId}`);
      setTeams(await res.json());
    };
    load();
  }, [companyId]);

  // Cargar agentes según equipo
  useEffect(() => {
    const load = async () => {
      if (!teamId) return;
      const res = await fetch(`/api/users?teamId=${teamId}&role=AGENT`);
      setAgents(await res.json());
    };
    load();
  }, [teamId]);

  async function onSubmit(data: LeadFormData) {
    setServerError("");
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        status,
        companyId,
        teamId,
        assignedToId,
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Error al guardar");
      return;
    }
    onSave();
  }

  const fields = [
    { label: "Nombres", name: "firstName", type: "text", required: true },
    { label: "Apellidos", name: "lastName", type: "text" },
    { label: "Teléfono 1", name: "phone1", type: "tel", required: true },
    { label: "Teléfono 2", name: "phone2", type: "tel" },
    { label: "Seguridad Social", name: "ssn", type: "text" },
    { label: "Dirección", name: "address", type: "text" },
    { label: "Ciudad", name: "city", type: "text" },
    { label: "Estado", name: "status", type: "text" },
    { label: "Código Postal", name: "zipCode", type: "text" },
    { label: "Email", name: "email", type: "email" },
    { label: "Fecha de nacimiento", name: "birthDate", type: "date" },
    { label: "Hora de contacto", name: "contactTime", type: "time" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#13151c] border border-white/10 rounded-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Editar Lead</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {serverError && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => (
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
            ))}

            {/* Status */}
            <div>
              <label className="text-xs text-white/40 mb-1 block">Estado</label>
              <CustomSelect
                name="status"
                value={STATUS[status]}
                onChange={setStatus}
                options={Object.keys(STATUS)}
                labels={Object.values(STATUS)}
              />
            </div>

            {/* Franquicia — solo ADMIN */}
            {role === "ADMIN" && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">
                  Franquicia
                </label>
                <CustomSelect
                  name="companyId"
                  value={
                    companies.find((c) => String(c.id) === companyId)?.name ??
                    "Seleccionar"
                  }
                  onChange={(val) => {
                      console.log("companyId seleccionado:", val);
                    setCompanyId(val);
                    setTeamId("");
                    setAssignedToId("");
                  }}
                  options={companies.map((c) => String(c.id))}
                  labels={companies.map((c) => c.name)}
                />
              </div>
            )}

            {/* Equipo — ADMIN, SUPERVISOR, COACH */}
            {(role === "ADMIN" ||
              role === "SUPERVISOR" ||
              role === "COACH") && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">
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

            {/* Agente — ADMIN, SUPERVISOR, COACH */}
            {(role === "ADMIN" ||
              role === "SUPERVISOR" ||
              role === "COACH") && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">
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
