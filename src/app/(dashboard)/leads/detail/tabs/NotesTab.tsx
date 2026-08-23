"use client";

import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plus, FileText } from "lucide-react";
import { Note, PropsNotesTab } from "@/utils/interfaces/notes";
import dynamic from "next/dynamic";
import { NoteCard } from "@/components/notes/NoteCard";

const NoteModal = dynamic(
  () => import("@/components/notes/NoteModal").then((m) => m.NoteModal),
  { ssr: false },
);
import { Loading } from "@/components/ui/Loading";

export function NotesTab({ leadId }: PropsNotesTab) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: notes = [], isLoading, mutate } = useSWR<Note[]>(
    `/api/leads/${leadId}/notes`,
    fetcher,
  );

  async function handleTogglePin(note: Note) {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Error al actualizar la nota");
      return;
    }
    void mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-lg">
          {notes.length} nota{notes.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-lg transition-colors"
        >
          <Plus size={16} />
          Nueva Nota
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-white/30 text-lg">
          <Loading />
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-surface border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center gap-2">
          <FileText size={32} className="text-white/20" />
          <p className="text-white/30 text-lg">No hay notas aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onTogglePin={handleTogglePin} />
          ))}
        </div>
      )}

      {modalOpen && (
        <NoteModal
          leadId={leadId}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            void mutate();
          }}
        />
      )}
    </div>
  );
}