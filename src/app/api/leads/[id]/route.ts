import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, forbidden, notFound, conflict } from "@/lib/api";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session) return forbidden();

  const lead = await prisma.lead.findUnique({
    where: { id: Number(id) },
    include: {
      company: { select: { id: true, name: true } },
      assignedTo: {
        select: {
          id: true,
          name: true,
          team: { select: { name: true } },
        },
      },
    },
  });

  if (!lead) return notFound("Lead no encontrado");

  return NextResponse.json(lead);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session) return forbidden();

  const user = session.user;
  const role = user.role;
  const body = await req.json();

  // Obtener lead actual
  const existing = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Lead no encontrado");

  // Validar permisos por rol
  if (role === "SUPERVISOR" || role === "COACH") {
    if (existing.companyId !== Number(user.companyId)) return forbidden();
  }

  if (role === "AGENT") {
    if (existing.assignedToId !== Number(user.id)) return forbidden();
  }

  // Campos editables por rol
  let data: Record<string, unknown> = {};

  if (role === "ADMIN") {
    // Admin puede editar todo incluyendo franquicia y agente
    data = {
      firstName: body.firstName,
      lastName: body.lastName || null,
      phone1: body.phone1,
      phone2: body.phone2 || null,
      ssn: body.ssn || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zipCode: body.zipCode || null,
      email: body.email || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      contactTime: body.contactTime || null,
      status: body.status,
      companyId: body.companyId ? Number(body.companyId) : existing.companyId,
      teamId: body.teamId ? Number(body.teamId) : existing.teamId,
      assignedToId: body.assignedToId
        ? Number(body.assignedToId)
        : existing.assignedToId,
    };
  } else if (role === "SUPERVISOR" || role === "COACH") {
    // Solo puede cambiar el agente asignado dentro de su franquicia
    data = {
      firstName: body.firstName,
      lastName: body.lastName || null,
      phone2: body.phone2 || null,
      ssn: body.ssn || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zipCode: body.zipCode || null,
      email: body.email || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      contactTime: body.contactTime || null,
      status: body.status,
      assignedToId: body.assignedToId
        ? Number(body.assignedToId)
        : existing.assignedToId,
      customerStatus: body.customerStatus || existing.customerStatus,
    };
  } else {
    // Agent solo edita datos básicos
    data = {
      firstName: body.firstName,
      lastName: body.lastName || null,
      phone2: body.phone2 || null,
      ssn: body.ssn || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zipCode: body.zipCode || null,
      email: body.email || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      contactTime: body.contactTime || null,
      status: body.status,
      customerStatus: body.customerStatus || existing.customerStatus,
    };
  }

  // Validar duplicados si cambia phone1 o ssn
  if (body.phone1 && body.phone1 !== existing.phone1) {
    const dup = await prisma.lead.findUnique({
      where: { phone1: body.phone1 },
    });
    if (dup) return conflict("El teléfono ya está registrado");

    // phone1 nuevo no puede existir como phone2 en otro registro
    const dupAsPhone2 = await prisma.lead.findFirst({
      where: { phone2: body.phone1, id: { not: Number(id) } },
    });
    if (dupAsPhone2)
      return conflict("El teléfono 1 ya está registrado como teléfono 2 en otro registro");
  }

  // Validar phone2
  if (body.phone2 && body.phone2 !== existing.phone2) {
    const dupAsPhone1 = await prisma.lead.findFirst({
      where: { phone1: body.phone2, id: { not: Number(id) } },
    });
    if (dupAsPhone1)
      return conflict("El teléfono 2 ya está registrado como teléfono 1 en otro registro");

    const dupAsPhone2 = await prisma.lead.findFirst({
      where: { phone2: body.phone2, id: { not: Number(id) } },
    });
    if (dupAsPhone2) return conflict("El teléfono 2 ya está registrado en otro registro");
  }

  if (body.ssn && body.ssn !== existing.ssn) {
    const dup = await prisma.lead.findUnique({ where: { ssn: body.ssn } });
    if (dup) return conflict("La Seguro social ya está registrada");
  }

  const lead = await prisma.lead.update({
    where: { id: Number(id) },
    data,
    include: {
      company: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(lead);
}
