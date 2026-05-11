import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Reminder } from "@/utils/interfaces/reminders";

export function useReminders(leadId: number) {
  const { data, isLoading, mutate } = useSWR<Reminder[]>(
    `/api/leads/${leadId}/reminders`,
    fetcher,
  );

  const reminders = data ?? [];
  const upcoming = reminders.filter((r) => new Date(r.scheduledAt) >= new Date());
  const past = reminders
    .filter((r) => new Date(r.scheduledAt) < new Date())
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return { reminders, loading: isLoading, upcoming, past, reload: mutate };
}