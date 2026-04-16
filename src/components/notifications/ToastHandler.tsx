"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import { Bell, CheckCircle, Clock } from "lucide-react";

export function ToastHandler() {
  const { pendingReminders, refresh } = useReminderNotifications();
  const shownIds = useRef<Set<number>>(new Set());

  const markAsCompleted = async (reminderId: number) => {
    try {
      const response = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reminderId, status: "COMPLETED" }),
      });

      if (response.ok) {
        refresh();
        return true;
      }
    } catch (error) {
      console.error("Error:", error);
    }
    return false;
  };

  const showToast = (reminder: any) => {
    const leadName = reminder.lead.fullName;
    const time = new Date(reminder.scheduledAt).toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });

    toast.custom(
      (t) => (
        <div className="bg-[#1a1c23] border border-white/10 rounded-lg shadow-xl w-80 overflow-hidden">
          <div className="p-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-transparent">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-semibold text-sm">
                Nuevo Recordatorio
              </span>
              <span className="text-white/40 text-xs ml-auto">{time}</span>
            </div>
          </div>

          <div className="p-3">
            <p className="text-white text-sm font-medium">{reminder.reason}</p>
            <p className="text-white/40 text-xs mt-1">Lead: {leadName}</p>
          </div>

          <div className="flex border-t border-white/10">
            <button
              onClick={async () => {
                toast.dismiss(t);
                await markAsCompleted(reminder.id);
                window.location.href = `/leads/${reminder.leadId}?tab=reminders`;
              }}
              className="flex-1 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-400/10 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Ver y Completar
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t);
                await markAsCompleted(reminder.id);
              }}
              className="flex-1 px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 border-l border-white/10"
            >
              <Clock className="w-4 h-4" />
              Marcar Leído
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000, // 10 segundos
        id: `reminder-${reminder.id}`, // Para no duplicar
      },
    );
  };

  useEffect(() => {
    pendingReminders.forEach((reminder) => {
      if (!shownIds.current.has(reminder.id)) {
        showToast(reminder);
        shownIds.current.add(reminder.id);
      }
    });
  }, [pendingReminders]);

  return null;
}
