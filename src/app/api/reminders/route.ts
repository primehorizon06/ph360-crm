// app/api/reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReminderWhere, UpdateReminderData } from "@/utils/interfaces/reminders";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener parámetros de consulta
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const leadId = searchParams.get("leadId");
    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";

    // Construir el where dinámicamente

    const where: ReminderWhere = {
      assignedToId: Number(session.user.id),
    };

    if (status) {
      where.status = status;
    }

    if (leadId) {
      where.leadId = Number(leadId);
    }

    // Filtrar por fecha
    const now = new Date();
    if (upcoming) {
      where.scheduledAt = { gte: now };
    } else if (past) {
      where.scheduledAt = { lt: now };
    }

    const reminders = await prisma.reminder.findMany({
      where,
      select: {
        id: true,
        reason: true,
        scheduledAt: true,
        status: true,
        lastNotifiedAt: true,
        createdAt: true,
        leadId: true,
        lead: {
          select: {
            firstName: true,
            lastName: true,
            phone1: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    // Transformar los datos para incluir nombre completo del lead
    const transformedReminders = reminders.map((reminder) => ({
      ...reminder,
      lead: {
        ...reminder.lead,
        fullName:
          `${reminder.lead.firstName} ${reminder.lead.lastName || ""}`.trim(),
      },
    }));

    return NextResponse.json(transformedReminders);
  } catch (error) {
    console.error("Error al obtener recordatorios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { scheduledAt, reason, assignedToId, leadId } = body;

    if (!scheduledAt || !reason || !assignedToId || !leadId) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 },
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        leadId: Number(leadId),
        scheduledAt: new Date(scheduledAt),
        reason,
        assignedToId: Number(assignedToId),
        createdById: Number(session.user.id),
        status: "PENDING",
      },
      select: {
        id: true,
        reason: true,
        scheduledAt: true,
        status: true,
        lead: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Error al crear recordatorio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, reason, scheduledAt, assignedToId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del recordatorio es requerido" },
        { status: 400 },
      );
    }

    // Verificar que el recordatorio existe y pertenece al usuario
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id: Number(id),
        assignedToId: Number(session.user.id),
      },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Recordatorio no encontrado" },
        { status: 404 },
      );
    }

    const updateData: UpdateReminderData = {};
    if (status) updateData.status = status;
    if (reason) updateData.reason = reason;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (assignedToId) updateData.assignedToId = Number(assignedToId);
    if (status === "COMPLETED") {
      updateData.lastNotifiedAt = new Date();
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error("Error al actualizar recordatorio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID del recordatorio es requerido" },
        { status: 400 },
      );
    }

    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id: Number(id),
        assignedToId: Number(session.user.id),
      },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Recordatorio no encontrado" },
        { status: 404 },
      );
    }

    await prisma.reminder.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Recordatorio eliminado" });
  } catch (error) {
    console.error("Error al eliminar recordatorio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
