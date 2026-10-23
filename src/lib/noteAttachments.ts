import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { UserFacingError } from "@/lib/errors";
import {
  sniffAttachmentType,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_TOTAL_SIZE,
} from "@/lib/fileValidation";
import { saveAttachmentFile, deleteAttachmentFile } from "@/lib/storage";

export interface AttachmentUpload {
  file: File;
  name: string;
  size: number;
  mime: string;
  ext: string;
}

export interface StoredAttachment {
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

const MULTIPART_OVERHEAD = 1024 * 1024;
const MAX_FILE_MB = MAX_ATTACHMENT_SIZE / 1024 / 1024;
const LIMITS_MESSAGE = `Máximo ${MAX_ATTACHMENT_FILES} archivos de hasta ${MAX_FILE_MB}MB cada uno`;

export async function readAttachmentUploads(req: NextRequest): Promise<AttachmentUpload[]> {
  const declaredSize = Number(req.headers.get("content-length"));
  if (declaredSize > MAX_ATTACHMENT_TOTAL_SIZE + MULTIPART_OVERHEAD)
    throw new UserFacingError(`La subida es demasiado grande. ${LIMITS_MESSAGE}`, 413);

  const files = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) throw new UserFacingError("No se enviaron archivos");
  if (files.length > MAX_ATTACHMENT_FILES)
    throw new UserFacingError(`Demasiados archivos. ${LIMITS_MESSAGE}`);
  if (files.reduce((total, f) => total + f.size, 0) > MAX_ATTACHMENT_TOTAL_SIZE)
    throw new UserFacingError(`La subida es demasiado grande. ${LIMITS_MESSAGE}`, 413);

  const uploads: AttachmentUpload[] = [];
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE)
      throw new UserFacingError(`Archivo demasiado grande: ${file.name}. Máximo ${MAX_FILE_MB}MB`);

    const detected = sniffAttachmentType(Buffer.from(await file.slice(0, 16).arrayBuffer()));
    if (!detected)
      throw new UserFacingError(`Tipo no permitido: ${file.name}. Solo JPEG, PNG, WebP o PDF`);

    uploads.push({ file, name: file.name, size: file.size, ...detected });
  }
  return uploads;
}

async function removeStoredFiles(filenames: string[]) {
  await Promise.all(
    filenames.map((filename) =>
      deleteAttachmentFile(filename).catch((err) =>
        console.error(`No se pudo borrar el adjunto ${filename}:`, err),
      ),
    ),
  );
}

export async function withStoredAttachments<T>(
  prefix: string,
  uploads: AttachmentUpload[],
  persist: (stored: StoredAttachment[]) => Promise<T>,
): Promise<T> {
  const filenames: string[] = [];
  try {
    const stored: StoredAttachment[] = [];
    for (const upload of uploads) {
      const filename = `${prefix}-${Date.now()}-${randomUUID()}.${upload.ext}`;
      const buffer = Buffer.from(await upload.file.arrayBuffer());
      const url = await saveAttachmentFile(filename, buffer, upload.mime);
      filenames.push(filename);
      stored.push({ name: upload.name, url, mimeType: upload.mime, size: upload.size });
    }
    return await persist(stored);
  } catch (err) {
    await removeStoredFiles(filenames);
    throw err;
  }
}

export function attachmentResponse<T extends { id: number }>(attachment: T) {
  return { ...attachment, url: `/api/attachments/${attachment.id}` };
}
