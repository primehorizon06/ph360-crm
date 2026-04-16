// components/notifications/NotificationBell.tsx
"use client";

import { useState } from "react";
import { Bell, CheckCircle } from "lucide-react";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

export function NotificationBell() {
  const { pendingReminders, refresh } = useReminderNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const pendingCount = pendingReminders.length;

  const markAsCompleted = async (
    reminderId: number,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Evitar que se dispare el onClick del div

    try {
      const response = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reminderId,
          status: "COMPLETED",
        }),
      });

      if (response.ok) {
        refresh(); // Actualizar la lista
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleReminderClick = (reminderId: number, leadId: number) => {
    // Marcar como completado y redirigir
    fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reminderId, status: "COMPLETED" }),
    }).then(() => {
      refresh();
      window.location.href = `/leads/${leadId}?tab=reminders`;
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-white" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1a1c23] border border-white/10 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-white font-semibold">
              Recordatorios Pendientes
            </h3>
            {pendingCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Marcar todos como completados (opcional)
                  Promise.all(
                    pendingReminders.map((r) =>
                      fetch("/api/reminders", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: r.id, status: "COMPLETED" }),
                      }),
                    ),
                  ).then(() => refresh());
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Marcar todos
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {pendingReminders.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">
                No hay recordatorios pendientes
              </div>
            ) : (
              pendingReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 group"
                  onClick={() =>
                    handleReminderClick(reminder.id, reminder.leadId)
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">
                        {reminder.reason}
                      </div>
                      <div className="text-white/40 text-xs mt-1">
                        Lead: {reminder.lead.fullName}
                      </div>
                      <div className="text-cyan-400 text-xs mt-1">
                        {new Date(reminder.scheduledAt).toLocaleString("es")}
                      </div>
                    </div>
                    <button
                      onClick={(e) => markAsCompleted(reminder.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-green-400 hover:text-green-300"
                      title="Marcar como completado"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
