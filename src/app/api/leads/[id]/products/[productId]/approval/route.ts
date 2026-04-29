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

  const { id, productId } = await params;
  const { action, note } = await req.json();

  if (!action || !["APPROVE", "REJECT", "RESUBMIT"].includes(action))
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

  // ── RESUBMIT — solo agente o admin ───────────────────────────────────────
  if (action === "RESUBMIT") {
    if (session.user.role !== "AGENT" && session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    await prisma.productApproval.update({
      where: { productId: Number(productId) },
      data: { status: "PENDING", note: null },
    });

    await prisma.product.update({
      where: { id: Number(productId) },
      data: { status: "ACTIVE" },
    });

    // Notificar al coach
    const lead = await prisma.lead.findUnique({
      where: { id: Number(id) },
      select: { firstName: true, lastName: true, teamId: true },
    });

    if (lead) {
      const coach = await prisma.user.findFirst({
        where: { teamId: lead.teamId, role: "COACH" },
        select: { id: true },
      });

      if (coach) {
        const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
        await prisma.notification.create({
          data: {
            userId: coach.id,
            type: "PRODUCT_APPROVAL_PENDING",
            title: "Producto reenviado para aprobación",
            body: `${leadName} ha corregido y reenviado un producto para tu revisión.`,
            leadId: Number(id),
            productId: Number(productId),
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  // ── APPROVE / REJECT — solo coach o supervisor ────────────────────────────
  if (session.user.role !== "COACH" && session.user.role !== "SUPERVISOR")
    return NextResponse.json(
      { error: "Solo el coach o supervisor puede aprobar" },
      { status: 403 },
    );

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

  // Actualizar la aprobación
  const updated = await prisma.productApproval.update({
    where: { productId: Number(productId) },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      note: action === "REJECT" ? note : null,
    },
  });

  if (action === "APPROVE" && approval.isFirstProduct) {
    await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        type: "customer",
        conversionStatus: "APPROVED",
        convertedAt: new Date(),
      },
    });
  }

  if (action === "REJECT" && approval.isFirstProduct) {
    await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        conversionStatus: "REJECTED",
        conversionNote: note,
      },
    });
  }

  // Suspender el producto al rechazar
  if (action === "REJECT") {
    await prisma.product.update({
      where: { id: Number(productId) },
      data: { status: "SUSPENDED" },
    });
  }

  return NextResponse.json(updated);
}
