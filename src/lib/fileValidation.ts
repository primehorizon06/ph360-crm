// Detección de tipo de archivo por firma binaria (magic bytes), no por
// Content-Type ni por el nombre del archivo, ambos controlables por el cliente.

type DetectedFile = { mime: string; ext: string };

function matches(buffer: Buffer, offset: number, signature: number[]): boolean {
  if (buffer.length < offset + signature.length) return false;
  return signature.every((byte, i) => buffer[offset + i] === byte);
}

export function sniffImageType(buffer: Buffer): DetectedFile | null {
  if (matches(buffer, 0, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (matches(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { mime: "image/png", ext: "png" };
  if (
    matches(buffer, 0, [0x52, 0x49, 0x46, 0x46]) &&
    matches(buffer, 8, [0x57, 0x45, 0x42, 0x50])
  )
    return { mime: "image/webp", ext: "webp" };
  return null;
}

export function sniffAttachmentType(buffer: Buffer): DetectedFile | null {
  const image = sniffImageType(buffer);
  if (image) return image;
  if (matches(buffer, 0, [0x25, 0x50, 0x44, 0x46])) return { mime: "application/pdf", ext: "pdf" };
  return null;
}
