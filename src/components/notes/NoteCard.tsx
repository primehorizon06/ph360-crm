import { FileText, Paperclip, Pin, PinOff } from "lucide-react";
import { AttachmentPreview } from "./AttachmentPreview";
import { Note } from "@/utils/interfaces/notes";

interface NoteCardProps {
  note: Note;
  onTogglePin?: (note: Note) => void;
}

export function NoteCard({ note, onTogglePin }: NoteCardProps) {
  const date = new Date(note.createdAt);

  return (
    <div
      className={`bg-surface border rounded-xl p-4 space-y-3 transition-colors ${
        note.pinned ? "border-cyan-500/50 bg-cyan-500/5" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-cyan-400 shrink-0" />
          <h3 className="text-white font-medium text-lg">{note.title}</h3>
          {note.pinned && (
            <span className="flex items-center gap-1 text-sm text-cyan-400 bg-cyan-500/10 rounded-full px-2 py-0.5">
              <Pin size={10} />
              Fijada
            </span>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="text-right">
            <p className="text-sm text-on-surface-variant">
              {date.toLocaleDateString("es-CO")}
            </p>
            <p className="text-sm text-white/90">
              {date.toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {onTogglePin && (
            <button
              type="button"
              onClick={() => onTogglePin(note)}
              title={note.pinned ? "Quitar de fijadas" : "Fijar nota"}
              className={`transition-colors ${
                note.pinned
                  ? "text-cyan-400 hover:text-cyan-300"
                  : "text-white/90 hover:text-white/60"
              }`}
            >
              {note.pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          )}
        </div>
      </div>

      <p className="text-lg text-white/60 leading-relaxed">{note.content}</p>

      {note.attachments?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-white/90 flex items-center gap-1">
            <Paperclip size={11} />
            {note.attachments.length} adjunto
            {note.attachments.length !== 1 ? "s" : ""}
          </p>

          {/* Imágenes en grid */}
          {note.attachments.filter((a) => a.mimeType?.startsWith("image/"))
            .length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {note.attachments
                .filter((a) => a.mimeType?.startsWith("image/"))
                .map((a) => (
                  <AttachmentPreview key={a.id} attachment={a} />
                ))}
            </div>
          )}

          {/* PDFs en lista */}
          {note.attachments.filter((a) => a.mimeType === "application/pdf")
            .length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {note.attachments
                .filter((a) => a.mimeType === "application/pdf")
                .map((a) => (
                  <AttachmentPreview key={a.id} attachment={a} />
                ))}
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-white/90">— {note.author.name}</p>
    </div>
  );
}
