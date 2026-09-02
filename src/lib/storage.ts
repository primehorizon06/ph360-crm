import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import { env } from "@/env";

const AVATARS_BUCKET = "avatars";
const ATTACHMENTS_BUCKET = "attachments";

const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function saveToLocalDisk(folder: string, filename: string, buffer: Buffer): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public/uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

async function deleteFromBucket(bucket: string, folder: string, filename: string): Promise<void> {
  if (supabase) {
    await supabase.storage.from(bucket).remove([filename]);
    return;
  }

  await unlink(path.join(process.cwd(), "public/uploads", folder, filename)).catch(() => {});
}

// Avatares: bucket público — no son datos sensibles, y evita el problema de
// que una URL firmada con expiración quede vieja dentro del JWT de sesión
// (dura hasta 1 hora, ver src/lib/auth.ts).
export async function saveAvatarFile(filename: string, buffer: Buffer, contentType: string): Promise<string> {
  if (supabase) {
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(filename, buffer, { contentType, upsert: false });
    if (error) throw error;

    return supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filename).data.publicUrl;
  }

  return saveToLocalDisk("avatars", filename, buffer);
}

export function deleteAvatarFile(filename: string): Promise<void> {
  return deleteFromBucket(AVATARS_BUCKET, "avatars", filename);
}

// Adjuntos de notas: bucket privado, nunca resuelto a una URL pública o
// firmada. El acceso real se sirve desde /api/attachments/[id], que valida
// canAccessLead() y devuelve los bytes del archivo directamente (el cliente
// de Supabase usa el service role key, que ignora las políticas del bucket).
export async function saveAttachmentFile(filename: string, buffer: Buffer, contentType: string): Promise<string> {
  if (supabase) {
    const { error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filename, buffer, { contentType, upsert: false });
    if (error) throw error;

    return filename;
  }

  return saveToLocalDisk("notes", filename, buffer);
}

export function deleteAttachmentFile(filename: string): Promise<void> {
  return deleteFromBucket(ATTACHMENTS_BUCKET, "notes", filename);
}

export async function readAttachmentFile(stored: string): Promise<Buffer> {
  if (supabase && !stored.startsWith("/")) {
    const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).download(stored);
    if (error) throw error;

    return Buffer.from(await data.arrayBuffer());
  }

  return readFile(path.join(process.cwd(), "public", stored));
}
