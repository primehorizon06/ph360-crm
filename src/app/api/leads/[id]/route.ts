import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, notFound, conflict, badRequest } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { canAccessLead } from "@/lib/permissions";
import { encryptDeterministic, decrypt } from "@/lib/crypto";
import { leadSchema } from "@/lib/validations/lead";
import { logAudit, getRequestMeta } from "@/lib/audit";

const leadPatchSchema = leadSchema.partial().passthrough();

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
    return NextResponse.json({ ...lead, ssn: decrypt(lead.ssn) });
  },
);

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    const user = session.user;
    const role = user.role;
    const rawBody = await req.json();

    const parsed = leadPatchSchema.safeParse(rawBody);
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");
    const body = parsed.data;

    const existing = await prisma.lead.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) return notFound("Lead no encontrado");

    if (!canAccessLead(user, existing)) return forbidden();

    if (role !== UserRole.ADMIN && existing.ssn && !body.ssn) {
      return forbidden(
        "Solo un administrador puede eliminar el número de seguro social",
      );
    }
    const ssnValue = body.ssn
      ? encryptDeterministic(body.ssn)
      : role === UserRole.ADMIN
        ? null
        : existing.ssn;

    let data: Record<string, unknown> = {};

    if (role === UserRole.ADMIN) {
      data = {
        firstName: body.firstName,
        lastName: body.lastName || null,
        phone1: body.phone1,
        phone2: body.phone2 || null,
        ssn: ssnValue,
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
        ssn: ssnValue,
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
        ssn: ssnValue,
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
      const dup = await prisma.lead.findFirst({
        where: { id: { not: Number(id) }, OR: [{ phone1: body.phone1 }, { phone2: body.phone1 }] },
        select: { phone1: true },
      });
      if (dup)
        return conflict(
          dup.phone1 === body.phone1
            ? "El teléfono ya está registrado"
            : "El teléfono 1 ya está registrado como teléfono 2 en otro cliente",
        );
    }

    if (body.phone2 && body.phone2 !== existing.phone2) {
      const dup = await prisma.lead.findFirst({
        where: { id: { not: Number(id) }, OR: [{ phone1: body.phone2 }, { phone2: body.phone2 }] },
        select: { phone1: true },
      });
      if (dup)
        return conflict(
          dup.phone1 === body.phone2
            ? "El teléfono 2 ya está registrado como teléfono 1 en otro cliente"
            : "El teléfono 2 ya está registrado en otro cliente",
        );
    }

    if (body.ssn && body.ssn !== decrypt(existing.ssn)) {
      const dup = await prisma.lead.findUnique({
        where: { ssn: encryptDeterministic(body.ssn) },
      });
      if (dup) return conflict("El Seguro social ya está registrado");
    }

    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data,
      include: {
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const changedFields = (Object.keys(data) as Array<keyof typeof data>).filter(
      (key) => (existing as Record<string, unknown>)[key] !== data[key],
    );

    await logAudit({
      action: "LEAD_UPDATED",
      actor: { id: user.id, role: user.role, name: user.name },
      entityType: "Lead",
      entityId: lead.id,
      metadata: { changedFields },
      ...getRequestMeta(req),
    });

    return NextResponse.json({ ...lead, ssn: decrypt(lead.ssn) });
  },
);
