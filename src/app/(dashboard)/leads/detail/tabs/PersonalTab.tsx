import { Lead } from "@/utils/interfaces/leads";
import { InfoField } from "../InfoField";

interface Props {
  lead: Lead;
}

export function PersonalTab({ lead }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-[#13151c] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 pb-3 border-b border-white/10">
          Información Personal
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="Nombres" value={lead.firstName} />
          <InfoField label="Apellidos" value={lead.lastName} />
          <InfoField label="Seguridad Social" value={lead.ssn} />
          <InfoField
            label="Fecha de nacimiento"
            value={
              lead.birthDate
                ? new Date(lead.birthDate).toLocaleDateString("es-CO")
                : null
            }
          />
          <InfoField label="Email" value={lead.email} />
        </div>
      </div>

      <div className="bg-[#13151c] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 pb-3 border-b border-white/10">
          Contacto
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="Teléfono 1" value={lead.phone1} />
          <InfoField label="Teléfono 2" value={lead.phone2} />
          <InfoField label="Hora de contacto" value={lead.contactTime} />
        </div>
      </div>

      <div className="bg-[#13151c] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 pb-3 border-b border-white/10">
          Dirección
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="Dirección" value={lead.address} />
          <InfoField label="Ciudad" value={lead.city} />
          <InfoField label="Estado" value={lead.state} />
          <InfoField label="Código Postal" value={lead.zipCode} />
        </div>
      </div>

      <div className="bg-[#13151c] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4 pb-3 border-b border-white/10">
          Registro
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoField
            label="Creado"
            value={new Date(lead.createdAt).toLocaleString("es-CO")}
          />
          <InfoField
            label="Última actualización"
            value={new Date(lead.updatedAt).toLocaleString("es-CO")}
          />
        </div>
      </div>
    </div>
  );
}
