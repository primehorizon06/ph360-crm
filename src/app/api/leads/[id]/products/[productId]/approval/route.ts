import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  if (session.user.role !== "COACH" && session.user.role !== "SUPERVISOR")
    return NextResponse.json(
      { error: "Solo el coach o supervisor puede aprobar" },
      { status: 403 },
    );

  const { id, productId } = await params;
  const { action, note } = await req.json(); // action: "APPROVE" | "REJECT"

  if (!action || !["APPROVE", "REJECT"].includes(action))
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

  if (action === "REJECT" && !note?.trim())
    return NextResponse.json(
      { error: "El motivo de rechazo es requerido" },
      { status: 400 },
    );

  const approval = await prisma.productApproval.findUnique({
    where: { productId: Number(productId) },
  });

  if (!approval)
    return NextResponse.json(
      { error: "Aprobación no encontrada" },
      { status: 404 },
    );

  // Actualizar la aprobación del producto
  const updated = await prisma.productApproval.update({
    where: { productId: Number(productId) },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      note: action === "REJECT" ? note : null,
    },
  });

  // Si es el primer producto y se aprueba → convertir a cliente
  if (action === "APPROVE" && approval.isFirstProduct) {
    await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        type: "customer",
        conversionStatus: "APPROVED",
      },
    });
  }

  // Si es el primer producto y se rechaza → marcar conversionStatus como REJECTED
  if (action === "REJECT" && approval.isFirstProduct) {
    await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        conversionStatus: "REJECTED",
        conversionNote: note,
      },
    });
  }

  return NextResponse.json(updated);
}
