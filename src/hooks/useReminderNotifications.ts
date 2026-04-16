import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface PendingReminder {
  id: number;
  reason: string;
  scheduledAt: string;
  status: string;
  leadId: number;
  lead: {
    firstName: string;
    lastName: string | null;
    fullName: string;
  };
  assignedTo: {
    id: number;
    name: string;
  };
}

// Hook para notificaciones globales (todos los leads)
export function useReminderNotifications() {
  const params = new URLSearchParams({
    status: "PENDING",
    past: "true",
  });

  const { data, error, isLoading, mutate } = useSWR<PendingReminder[]>(
    `/api/reminders?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 30000, // Cada 30 segundos
      revalidateOnFocus: true,
    },
  );

  return {
    pendingReminders: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
