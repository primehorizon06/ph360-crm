import { Reminder } from "@/utils/interfaces/reminders";
import { Bell, User } from "lucide-react";

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const date = new Date(reminder.scheduledAt);
  const isPast = date < new Date();

  return (
    <div
      className={`bg-[#13151c] border rounded-xl p-4 space-y-3 ${isPast ? "border-red-500/20" : "border-white/10"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell
            size={14}
            className={isPast ? "text-red-400" : "text-cyan-400"}
          />
          <h3 className="text-white font-medium text-sm">{reminder.reason}</h3>
          {isPast && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
              Vencido
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-white/40">
            {date.toLocaleDateString("es-CO")}
          </p>
          <p className="text-xs text-white/30">
            {date.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <User size={11} />
          Asignado a:{" "}
          <span className="text-white/60 ml-1">{reminder.assignedTo.name}</span>
        </span>
        <span>
          Creado por:{" "}
          <span className="text-white/60">{reminder.createdBy.name}</span>
        </span>
      </div>
    </div>
  );
}
