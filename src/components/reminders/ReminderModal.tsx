"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { z } from "zod";
import useSWR from "swr";

import { toast } from "sonner";
import { CustomSelect } from "@/components/ui/Select";
import { Agent } from "@/utils/interfaces/reminders";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { fetcher } from "@/lib/fetcher";

const schema = z.object({
  scheduledAt: z.date().catch(new Date()),
  reason: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
  assignedToId: z.string().min(1, "Debes asignar un responsable"),
});

type ReminderFormData = z.infer<typeof schema>;

interface ReminderModalProps {
  leadId: string | number;
  onClose: () => void;
  onSave: () => void;
}

export function ReminderModal({ leadId, onClose, onSave }: ReminderModalProps) {
  const { data: session } = useSession();

  const agentsKey = session?.user?.teamId
    ? `/api/users?teamId=${session.user.teamId}`
    : null;
  const { data: agents = [] } = useSWR<Agent[]>(agentsKey, fetcher);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      scheduledAt: new Date(),
      reason: "",
      assignedToId: "",
    },
  });

  const onSubmit = async (data: ReminderFormData) => {
    const selectedAgent = agents.find((agent) => agent.name === data.assignedToId);

    if (!selectedAgent) {
      toast.error("Selecciona un responsable válido");
      return;
    }

    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        scheduledAt: data.scheduledAt.toISOString(),
        reason: data.reason,
        assignedToId: selectedAgent.id,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      toast.error(error.error ?? "Error al guardar");
      return;
    }

    toast.success("Recordatorio creado");
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">Nuevo Recordatorio</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* DateTimePicker - Fecha y hora */}
            <Controller
              name="scheduledAt"
              control={control}
              render={({ field: { value, onChange } }) => (
                <DateTimePicker
                  id="scheduledAt"
                  label="Fecha y hora del recordatorio"
                  value={value}
                  onChange={onChange}
                  required
                />
              )}
            />
            {errors.scheduledAt && (
              <p className="text-red-400 text-sm mt-1">
                {errors.scheduledAt.message}
              </p>
            )}

            {/* Asignar a */}
            <div>
              <label className="text-sm text-white/40 mb-1 block">
                Asignar a <span className="text-red-400">*</span>
              </label>
              <Controller
                name="assignedToId"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <CustomSelect
                    name="assignedToId"
                    value={value}
                    onChange={onChange}
                    options={agents.map((agent) => agent.name)}
                  />
                )}
              />
              {errors.assignedToId && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.assignedToId.message}
                </p>
              )}
            </div>

            {/* Título/Motivo */}
            <div>
              <label className="text-sm text-white/40 mb-1 block">
                Título <span className="text-red-400">*</span>
              </label>
              <Controller
                name="reason"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <textarea
                    value={value}
                    onChange={onChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50 flex items-center justify-between"
                    placeholder="Escribe el título del recordatorio"
                    rows={3}
                  />
                )}
              />
              {errors.reason && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.reason.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-5 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-lg text-white/50 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar recordatorio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
