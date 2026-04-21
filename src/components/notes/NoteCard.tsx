import { FileText, Paperclip } from "lucide-react";
import { AttachmentPreview } from "./AttachmentPreview";
import { Note } from "@/utils/interfaces/notes";

export function NoteCard({ note }: { note: Note }) {
  const date = new Date(note.createdAt);

  return (
    <div className="bg-[#13151c] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-cyan-400 shrink-0" />
          <h3 className="text-white font-medium text-sm">{note.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-white/40">
            {date.toLocaleDateString("es-CO")}
          </p>
          <p className="text-xs text-white/30">
            {date.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <p className="text-sm text-white/60 leading-relaxed">{note.content}</p>

      {note.attachments?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/30 flex items-center gap-1">
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

      <p className="text-xs text-white/30">— {note.author.name}</p>
    </div>
  );
}
