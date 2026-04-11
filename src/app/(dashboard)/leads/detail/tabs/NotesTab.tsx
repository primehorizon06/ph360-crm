"use client";

import { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { Note, PropsNotesTab } from "@/utils/interfaces/notes";
import { NoteCard } from "./notes/NoteCard";
import { NoteModal } from "./notes/NoteModal";

export function NotesTab({ leadId }: PropsNotesTab) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadNotes() {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/notes`);
    setNotes(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadNotes();
  }, [leadId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">
          {notes.length} nota{notes.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
          Nueva Nota
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/30 text-sm">
          Cargando...
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-[#13151c] border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center gap-2">
          <FileText size={32} className="text-white/20" />
          <p className="text-white/30 text-sm">No hay notas aún</p>
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
            loadNotes();
          }}
        />
      )}
    </div>
  );
}
