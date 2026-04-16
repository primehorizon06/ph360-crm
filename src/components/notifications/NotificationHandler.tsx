"use client";

import { useEffect, useRef } from "react";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

export function NotificationHandler() {
  const { pendingReminders, refresh } = useReminderNotifications();
  const notifiedIds = useRef<Set<number>>(new Set());

  const markAsCompleted = async (reminderId: number) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: reminderId, 
          status: "COMPLETED" 
        }),
      });
      
      if (response.ok) {
        console.log(`Recordatorio ${reminderId} marcado como completado`);
        // Refrescar la lista de pendientes
        refresh();
      } else {
        console.error('Error al marcar como completado');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const showNotification = (reminder: any) => {
    if (!("Notification" in window)) return;
    
    const leadName = reminder.lead.fullName;
    
    if (Notification.permission === "granted") {
      const notification = new Notification("📅 Nuevo recordatorio", {
        body: `${reminder.reason}\nLead: ${leadName}`,
        icon: "/bell-icon.png",
        tag: `reminder-${reminder.id}`,
        requireInteraction: true,
        data: {
          reminderId: reminder.id,
          leadId: reminder.leadId,
        },
      });

      notification.onclick = async (event) => {
        event.preventDefault();
        window.focus();
        
        // 1. Marcar como completado ANTES de redirigir
        await markAsCompleted(reminder.id);
        
        // 2. Redirigir al lead con el tab de recordatorios
        window.location.href = `/leads/${reminder.leadId}?tab=reminders`;
      };
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    pendingReminders.forEach((reminder) => {
      if (!notifiedIds.current.has(reminder.id)) {
        showNotification(reminder);
        notifiedIds.current.add(reminder.id);
      }
    });
  }, [pendingReminders]);

  return null;
}