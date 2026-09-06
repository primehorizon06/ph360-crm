"use client";

import { useState } from "react";
import { Plus, Bell } from "lucide-react";
import dynamic from "next/dynamic";
import { ReminderCard } from "@/components/reminders/ReminderCard";

const ReminderModal = dynamic(
  () => import("@/components/reminders/ReminderModal").then((m) => m.ReminderModal),
  { ssr: false },
);
import { useReminders } from "@/hooks/useReminders";
import { Loading } from "@/components/ui/Loading";

export function RemindersTab({ leadId }: { leadId: number }) {
  const { reminders, loading, upcoming, past, reload } = useReminders(leadId);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-on-surface-variant text-lg">
          {reminders.length} agendamientos
        </p>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-lg transition-colors"
        >
          <Plus size={16} />
          Nuevo recordatorio
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : reminders.length === 0 ? (
        <div className="text-center">
          <Bell />
          <p>No hay agendamientos</p>
        </div>
      ) : (
        <>
          {upcoming.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
          {past.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </>
      )}

      {modalOpen && (
        <ReminderModal
          leadId={leadId}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
