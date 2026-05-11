import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, notFound, conflict } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";

export const GET = withAuthParams<{ id: string }>(
  async (_req, _session, { id }) => {
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
  },
);

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    const user = session.user;
    const role = user.role;
    const body = await req.json();

    const existing = await prisma.lead.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) return notFound("Lead no encontrado");

    if (role === UserRole.SUPERVISOR || role === UserRole.COACH) {
      if (existing.companyId !== Number(user.companyId)) return forbidden();
    }
    if (role === UserRole.AGENT) {
      if (existing.assignedToId !== Number(user.id)) return forbidden();
    }

    let data: Record<string, unknown> = {};

    if (role === UserRole.ADMIN) {
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
    } else if (role === UserRole.SUPERVISOR || role === UserRole.COACH) {
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

    if (body.phone1 && body.phone1 !== existing.phone1) {
      const dup = await prisma.lead.findUnique({
        where: { phone1: body.phone1 },
      });
      if (dup) return conflict("El teléfono ya está registrado");

      const dupAsPhone2 = await prisma.lead.findFirst({
        where: { phone2: body.phone1, id: { not: Number(id) } },
      });
      if (dupAsPhone2)
        return conflict(
          "El teléfono 1 ya está registrado como teléfono 2 en otro registro",
        );
    }

    if (body.phone2 && body.phone2 !== existing.phone2) {
      const dupAsPhone1 = await prisma.lead.findFirst({
        where: { phone1: body.phone2, id: { not: Number(id) } },
      });
      if (dupAsPhone1)
        return conflict(
          "El teléfono 2 ya está registrado como teléfono 1 en otro registro",
        );

      const dupAsPhone2 = await prisma.lead.findFirst({
        where: { phone2: body.phone2, id: { not: Number(id) } },
      });
      if (dupAsPhone2)
        return conflict("El teléfono 2 ya está registrado en otro registro");
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
  },
);
