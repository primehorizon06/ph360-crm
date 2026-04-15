import { Reminder } from "@/utils/interfaces/reminders";
import { useEffect, useState } from "react";

export function useReminders(leadId: number) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = async () => {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/reminders`);
    if (!res.ok) {
      console.error("Error API", await res.text());
      setReminders([]);
      return;
    }

    setReminders(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    loadReminders();
  }, [leadId]);

  const upcoming = reminders.filter(
    (r) => new Date(r.scheduledAt) >= new Date(),
  );
  const past = reminders.filter((r) => new Date(r.scheduledAt) < new Date());

  return {
    reminders,
    loading,
    upcoming,
    past,
    reload: loadReminders,
  };
}
