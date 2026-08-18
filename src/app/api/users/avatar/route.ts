import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withAuth, badRequest, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { sniffImageType, MAX_IMAGE_SIZE } from "@/lib/fileValidation";

export const POST = withAuth(async (req, session) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file || !userId) return badRequest("Datos incompletos");
  if (file.size > MAX_IMAGE_SIZE) return badRequest("La imagen no puede superar 5MB");

  const isSelf = session.user.id === userId;
  if (!isSelf && session.user.role !== UserRole.ADMIN) return forbidden();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const detected = sniffImageType(buffer);
  if (!detected) return badRequest("Solo se permiten imágenes JPEG, PNG o WebP");

  const filename = `avatar-${userId}-${Date.now()}.${detected.ext}`;
  const uploadDir = path.join(process.cwd(), "public/uploads/avatars");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const avatarUrl = `/uploads/avatars/${filename}`;

  await prisma.user.update({
    where: { id: Number(userId) },
    data: { avatar: avatarUrl },
  });

  return NextResponse.json({ url: avatarUrl });
});
