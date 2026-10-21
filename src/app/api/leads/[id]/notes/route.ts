import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, notFound, forbidden } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { sanitizeNoteHtml } from "@/lib/sanitizeHtml";
import { richTextLength } from "@/lib/richText";

export const GET = withAuthParams<{ id: string }>(async (_req, session, { id }) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) return notFound("Lead no encontrado");
  if (!canAccessLead(session.user, lead)) return forbidden();

  const notes = await prisma.note.findMany({
    where: { leadId: Number(id) },
    select: {
      id: true,
      title: true,
      content: true,
      pinned: true,
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
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  const withResolvedUrls = notes.map((note) => ({
    ...note,
    attachments: note.attachments.map((att) => ({
      ...att,
      url: `/api/attachments/${att.id}`,
    })),
  }));

  return NextResponse.json(withResolvedUrls);
});

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) return notFound("Lead no encontrado");
  if (!canAccessLead(session.user, lead)) return forbidden();

  const { title, content } = await req.json();
  if (!title || typeof content !== "string") return badRequest("Título y contenido son requeridos");

  const safeContent = sanitizeNoteHtml(content);
  if (richTextLength(safeContent) < 5) return badRequest("El contenido debe tener mínimo 5 caracteres");

  const note = await prisma.note.create({
    data: {
      title,
      content: safeContent,
      leadId: Number(id),
      authorId: Number(session.user.id),
    },
    select: {
      id: true,
      title: true,
      content: true,
      pinned: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
});
