import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { sniffImageType, MAX_IMAGE_SIZE } from "@/lib/fileValidation";
import { saveAvatarFile, deleteAvatarFile } from "@/lib/storage";
import { logAudit, getRequestMeta } from "@/lib/audit";

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  if (session.user.role !== UserRole.ADMIN) return forbidden();

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return badRequest("No se envió ningún archivo");
  if (file.size > MAX_IMAGE_SIZE) return badRequest("La imagen no puede superar 5MB");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const detected = sniffImageType(buffer);
  if (!detected) return badRequest("Solo se permiten imágenes JPEG, PNG o WebP");

  const filename = `company-${id}-${Date.now()}.${detected.ext}`;
  const logoUrl = await saveAvatarFile(filename, buffer, detected.mime);

  try {
    await prisma.company.update({
      where: { id: Number(id) },
      data: { logo: logoUrl },
    });
  } catch (err) {
    await deleteAvatarFile(filename).catch(() => {});
    throw err;
  }

  await logAudit({
    action: "COMPANY_UPDATED",
    actor: { id: session.user.id, role: session.user.role, name: session.user.name },
    entityType: "Company",
    entityId: Number(id),
    metadata: { field: "logo" },
    ...getRequestMeta(req),
  });

  return NextResponse.json({ url: logoUrl });
});
