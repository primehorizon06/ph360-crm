import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withAuth, badRequest } from "@/lib/api";

export const POST = withAuth(async (req) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file) return badRequest("No se envió archivo");
  if (!file.type.startsWith("image/")) return badRequest("Solo se permiten imágenes");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop();
  const filename = `avatar-${userId}-${Date.now()}.${ext}`;
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
