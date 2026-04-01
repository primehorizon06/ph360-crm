import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file) return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }

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
}
