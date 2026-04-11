"use client";

import { useState } from "react";
import { File, ImageIcon, X, ZoomIn } from "lucide-react";;

interface NoteAttachment {
  id: number;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

function Lightbox({
  attachment,
  onClose,
}: {
  attachment: NoteAttachment;
  onClose: () => void;
}) {
  const isImage = attachment.mimeType?.startsWith("image/");

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      <div
        className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white/60 text-sm truncate max-w-full">
          {attachment.name}
        </p>

        {isImage ? (
          <div className="relative w-full max-h-[80vh] flex items-center justify-center">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        ) : (
          <iframe
            src={attachment.url}
            className="w-full h-[80vh] rounded-lg bg-white"
            title={attachment.name}
          />
        )}
      </div>
    </div>
  );
}

export function AttachmentPreview({
  attachment,
}: {
  attachment: NoteAttachment;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isImage = attachment.mimeType?.startsWith("image/");

  return (
    <>
      {isImage ? (
        // Preview de imagen inline
        <button
          onClick={() => setLightboxOpen(true)}
          className="relative group rounded-lg overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-colors"
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-24 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ZoomIn size={20} className="text-white" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
            <p className="text-xs text-white/70 truncate">{attachment.name}</p>
          </div>
        </button>
      ) : (
        // PDF — link con preview al hacer clic
        <button
          onClick={() => setLightboxOpen(true)}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-lg px-3 py-2 transition-colors group w-full"
        >
          <File size={14} className="text-red-400 shrink-0" />
          <span className="text-xs text-white/60 truncate flex-1 group-hover:text-white transition-colors">
            {attachment.name}
          </span>
          {attachment.size && (
            <span className="text-xs text-white/30 shrink-0">
              {(attachment.size / 1024).toFixed(0)}kb
            </span>
          )}
        </button>
      )}

      {lightboxOpen && (
        <Lightbox
          attachment={attachment}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
