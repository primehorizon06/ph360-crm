"use client";

import { File, ZoomIn } from "lucide-react";

interface NoteAttachment {
  id: number;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

export function AttachmentPreview({
  attachment,
}: {
  attachment: NoteAttachment;
}) {
  const isImage = attachment.mimeType?.startsWith("image/");

  return isImage ? (
    // Preview de imagen inline
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
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
        <p className="text-sm text-white/70 truncate">{attachment.name}</p>
      </div>
    </a>
  ) : (
    // PDF u otro archivo — abre en pestaña nueva
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center mt-auto gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-lg px-3 py-2 transition-colors group w-full"
    >
      <File size={14} className="text-red-400 shrink-0" />
      <span className="text-sm text-white/60 truncate flex-1 group-hover:text-white transition-colors">
        {attachment.name}
      </span>
      {attachment.size && (
        <span className="text-sm text-white/90 shrink-0">
          {(attachment.size / 1024).toFixed(0)}kb
        </span>
      )}
    </a>
  );
}
