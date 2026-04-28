"use client";

import { useState } from "react";
import { Bell, CheckCircle, ShoppingBag, X } from "lucide-react";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import { useNotifications } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const { pendingReminders, refresh: refreshReminders } =
    useReminderNotifications();
  const { notifications, refresh: refreshNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const totalCount = pendingReminders.length + notifications.length;

  // ── Reminders ──────────────────────────────────────────────────────────────

  const markReminderCompleted = async (
    reminderId: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reminderId, status: "COMPLETED" }),
    });
    refreshReminders();
  };

  const handleReminderClick = (reminderId: number, leadId: number) => {
    fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reminderId, status: "COMPLETED" }),
    }).then(() => {
      refreshReminders();
      setIsOpen(false);
      router.push(`/leads/${leadId}?tab=reminders`);
    });
  };

  const markAllRemindersCompleted = () => {
    Promise.all(
      pendingReminders.map((r) =>
        fetch("/api/reminders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.id, status: "COMPLETED" }),
        }),
      ),
    ).then(() => refreshReminders());
  };

  // ── Notifications ──────────────────────────────────────────────────────────

  const markNotificationRead = async (
    notificationId: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notificationId }),
    });
    refreshNotifications();
  };

  const handleNotificationClick = async (
    notificationId: number,
    leadId: number,
  ) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notificationId }),
    });
    refreshNotifications();
    setIsOpen(false);
    router.push(`/leads/${leadId}?tab=products`);
  };

  const markAllNotificationsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    });
    refreshNotifications();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-white" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-sm rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-[#1a1c23] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* ── Recordatorios ── */}
            {pendingReminders.length > 0 && (
              <>
                <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h3 className="text-white/70 text-sm font-medium uppercase tracking-widest">
                    Recordatorios
                  </h3>
                  <button
                    onClick={markAllRemindersCompleted}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Marcar todos
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {pendingReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 group"
                      onClick={() =>
                        handleReminderClick(reminder.id, reminder.leadId)
                      }
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white text-lg font-medium">
                            {reminder.reason}
                          </p>
                          <p className="text-white/40 text-sm mt-0.5">
                            Lead: {reminder.lead.fullName}
                          </p>
                          <p className="text-cyan-400 text-sm mt-0.5">
                            {new Date(reminder.scheduledAt).toLocaleString(
                              "es",
                            )}
                          </p>
                        </div>
                        <button
                          onClick={(e) => markReminderCompleted(reminder.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-green-400 hover:text-green-300 shrink-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Notificaciones de aprobación ── */}
            {notifications.length > 0 && (
              <>
                <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h3 className="text-white/70 text-sm font-medium uppercase tracking-widest">
                    Aprobaciones
                  </h3>
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Marcar todas
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 group"
                      onClick={() => handleNotificationClick(n.id, n.leadId)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <ShoppingBag
                            size={14}
                            className="text-amber-400 shrink-0 mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-white text-lg font-medium">
                              {n.title}
                            </p>
                            <p className="text-white/40 text-sm mt-0.5">
                              {n.body}
                            </p>
                            <p className="text-white/20 text-sm mt-0.5">
                              {new Date(n.createdAt).toLocaleString("es")}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => markNotificationRead(n.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/60 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Estado vacío */}
            {totalCount === 0 && (
              <div className="p-6 text-center text-white/30 text-lg">
                No hay notificaciones pendientes
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
