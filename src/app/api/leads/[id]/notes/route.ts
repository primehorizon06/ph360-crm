import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, forbidden, badRequest } from "@/lib/api";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session) return forbidden();

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
  const session = await getAuthSession();
  if (!session) return forbidden();

  const { title, content } = await req.json();
  if (!title || !content) return badRequest("Título y contenido son requeridos");

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
