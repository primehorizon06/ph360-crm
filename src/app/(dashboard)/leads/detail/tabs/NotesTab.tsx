"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plus, FileText } from "lucide-react";
import { Note, PropsNotesTab } from "@/utils/interfaces/notes";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteModal } from "@/components/notes/NoteModal";
import { Loading } from "@/components/ui/Loading";

export function NotesTab({ leadId }: PropsNotesTab) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: notes = [], isLoading, mutate } = useSWR<Note[]>(
    `/api/leads/${leadId}/notes`,
    fetcher,
  );

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
        <div className="bg-[#13151c] border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center gap-2">
          <FileText size={32} className="text-white/20" />
          <p className="text-white/30 text-lg">No hay notas aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
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