"use client";

import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Paperclip, File, ImageIcon } from "lucide-react";
import { CustomSelect } from "@/components/ui/Select";
import { NoteFormData, noteSchema, Props } from "@/utils/interfaces/notes";
import { NOTE_TITLES } from "@/utils/constants/notes";

export function NoteModal({ leadId, onClose, onSave }: Props) {
  const [serverError, setServerError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: NOTE_TITLES[0] },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const allowed = selected.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        f.type,
      ),
    );
    setFiles((prev) => [...prev, ...allowed]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(data: NoteFormData) {
    setServerError("");

    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerError(json.error ?? "Error al guardar");
      return;
    }

    const note = await res.json();

    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      await fetch(`/api/notes/${note.id}/attachments`, {
        method: "POST",
        body: formData,
      });
    }

    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#13151c] border border-white/10 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">Nueva Nota</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {serverError && (
            <p className="text-red-400 text-lg bg-red-500/10 px-3 py-2 rounded-lg">
              {serverError}
            </p>
          )}

          <div>
            <label className="text-sm text-white/40 mb-1 block">
              Título <span className="text-red-400">*</span>
            </label>
            <Controller
              name="title"
              control={control}
              render={({ field: { value, onChange } }) => (
                <CustomSelect
                  name="title"
                  value={value}
                  onChange={onChange}
                  options={NOTE_TITLES}
                />
              )}
            />
            {errors.title && (
              <p className="text-red-400 text-sm mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-white/40 mb-1 block">
              Contenido <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register("content")}
              rows={5}
              placeholder="Escribe aquí los detalles de la nota..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-lg text-white outline-none focus:border-cyan-500/50 resize-none"
            />
            {errors.content && (
              <p className="text-red-400 text-sm mt-1">
                {errors.content.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-white/40 mb-1 block">
              Adjuntos (imágenes y PDF)
            </label>
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
              <div className="mt-2 space-y-1.5">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {file.type === "application/pdf" ? (
                        <File size={14} className="text-red-400 shrink-0" />
                      ) : (
                        <ImageIcon
                          size={14}
                          className="text-cyan-400 shrink-0"
                        />
                      )}
                      <span className="text-sm text-white/60 truncate">
                        {file.name}
                      </span>
                      <span className="text-sm text-white/30 shrink-0">
                        {(file.size / 1024).toFixed(0)}kb
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
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-lg text-white/50 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Guardar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}
