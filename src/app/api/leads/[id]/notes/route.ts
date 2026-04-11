import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const notes = await prisma.note.findMany({
    where: { leadId: Number(id) },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          name: true,
          url: true,
          mimeType: true,
          size: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { title, content } = await req.json();

  if (!title || !content) {
    return NextResponse.json(
      { error: "Título y contenido son requeridos" },
      { status: 400 },
    );
  }

  const note = await prisma.note.create({
    data: {
      title,
      content,
      leadId: Number(id),
      authorId: Number(session.user.id),
    },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
