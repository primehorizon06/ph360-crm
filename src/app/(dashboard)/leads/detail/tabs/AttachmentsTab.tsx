"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Paperclip,
  Search,
  Calendar,
  User,
  X,
  Upload,
  File,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { Loading } from "@/components/ui/Loading";
import { AttachmentPreview } from "@/components/notes/AttachmentPreview";
import {
  Attachment,
  PropsAttachmentsTab,
} from "@/utils/interfaces/attachments";

export function AttachmentsTab({ leadId }: PropsAttachmentsTab) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [authorSearch, setAuthorSearch] = useState("");

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function loadAttachments() {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/notes/attachments`);
    setAttachments(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAttachments();
  }, [leadId]);

  const filtered = useMemo(() => {
    return attachments.filter((att) => {
      const created = new Date(att.createdAt);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (created > to) return false;
      }
      if (
        authorSearch.trim() &&
        !att.author.name.toLowerCase().includes(authorSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [attachments, dateFrom, dateTo, authorSearch]);

  const hasFilters = dateFrom || dateTo || authorSearch.trim();

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setAuthorSearch("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    setUploadError("");
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const res = await fetch(`/api/leads/${leadId}/attachments`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      const data = await res.json();
      setUploadError(data.error ?? "Error al subir archivos");
      return;
    }

    setFiles([]);
    loadAttachments();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-lg">
          {filtered.length} de {attachments.length} adjunto
          {filtered.length !== 1 ? "s" : ""}
        </p>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[#13151c] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-sm text-white/40">
              <Calendar size={11} />
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-sm text-white/40">
              <Calendar size={11} />
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-lg text-white/80 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-sm text-white/40">
            <User size={11} />
            Autor
          </label>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por nombre de autor..."
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              className="w-full bg-[#0d0f14] border border-white/10 rounded-lg pl-8 py-2 text-lg text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
            {authorSearch && (
              <button
                onClick={() => setAuthorSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        </div>

        
      </div>

      {/* Uploader */}
      <div className="bg-[#13151c] border border-white/10 rounded-xl p-4 space-y-3">
        <p className="text-white/30 text-sm font-medium uppercase tracking-widest">
          Subir archivos
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-lg px-4 py-3 text-lg text-white/50 hover:text-white transition-colors w-full"
        >
          <Paperclip size={16} />
          Seleccionar archivos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {file.type === "application/pdf" ? (
                    <File size={14} className="text-red-400 shrink-0" />
                  ) : (
                    <ImageIcon size={14} className="text-cyan-400 shrink-0" />
                  )}
                  <span className="text-sm text-white/60 truncate">
                    {file.name}
                  </span>
                  <span className="text-sm text-white/30 shrink-0">
                    {(file.size / 1024).toFixed(0)} kb
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-white/30 hover:text-red-400 transition-colors ml-2 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {uploadError && (
              <p className="text-red-400 text-sm px-1">{uploadError}</p>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center justify-center gap-2 w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium px-4 py-2 rounded-lg text-lg transition-colors"
            >
              {uploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {uploading
                ? "Subiendo..."
                : `Subir ${files.length} archivo${files.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-white/30 text-lg">
          <Loading />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#13151c] border border-white/10 rounded-xl p-12 flex flex-col items-center justify-center gap-2">
          <Paperclip size={32} className="text-white/20" />
          <p className="text-white/30 text-lg">
            {hasFilters
              ? "Sin resultados para los filtros aplicados"
              : "No hay adjuntos aún"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map((att) => (
            <div
              key={att.id}
              className="flex flex-col gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-lg px-3 py-2 transition-colors group w-full"
            >
              <AttachmentPreview attachment={att} />
              <div className="mt-auto min-w-0">
                <span className="text-white/30 text-sm flex items-center gap-1">
                  <User size={10} />
                  {att.author.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
