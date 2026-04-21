import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;

  const attachments = await prisma.noteAttachment.findMany({
    where: {
      note: {
        leadId: Number(id),
      },
    },
    select: {
      id: true,
      name: true,
      url: true,
      mimeType: true,
      size: true,
      createdAt: true,
      note: {
        select: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Aplanar el autor para que el frontend lo consuma igual que antes
  const flat = attachments.map(({ note, ...att }) => ({
    ...att,
    author: note.author,
  }));

  return NextResponse.json(flat);
}
