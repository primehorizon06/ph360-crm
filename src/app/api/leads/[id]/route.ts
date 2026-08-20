import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, notFound, conflict, badRequest } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { canAccessLead } from "@/lib/permissions";
import { encryptDeterministic, decrypt } from "@/lib/crypto";
import { leadSchema } from "@/lib/validations/lead";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { optionalField, optionalDate } from "@/lib/patchFields";
import { findDuplicatePhone } from "@/lib/leadService";

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
    const leadId = Number(id);
    const rawBody = await req.json();

    const parsed = leadPatchSchema.safeParse(rawBody);
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");
    const body = parsed.data;

    const existing = await prisma.lead.findUnique({ where: { id: leadId } });
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

    if (
      (role === UserRole.SUPERVISOR || role === UserRole.COACH) &&
      body.assignedToId &&
      Number(body.assignedToId) !== existing.assignedToId
    ) {
      const target = await prisma.user.findUnique({
        where: { id: Number(body.assignedToId) },
        select: { companyId: true, teamId: true },
      });
      const inScope =
        !!target &&
        (role === UserRole.SUPERVISOR
          ? target.companyId === user.companyId
          : target.teamId === user.teamId);
      if (!inScope)
        return forbidden("No puedes asignar el lead a ese usuario");
    }

    const baseData = {
      firstName: body.firstName,
      lastName: optionalField(body.lastName),
      phone2: optionalField(body.phone2),
      ssn: ssnValue,
      address: optionalField(body.address),
      city: optionalField(body.city),
      state: optionalField(body.state),
      zipCode: optionalField(body.zipCode),
      email: optionalField(body.email),
      birthDate: optionalDate(body.birthDate),
      contactTime: optionalField(body.contactTime),
      status: body.status,
    };

    let data: Record<string, unknown>;

    if (role === UserRole.ADMIN) {
      data = {
        ...baseData,
        phone1: body.phone1,
        companyId: body.companyId ? Number(body.companyId) : existing.companyId,
        teamId: body.teamId ? Number(body.teamId) : existing.teamId,
        assignedToId: body.assignedToId
          ? Number(body.assignedToId)
          : existing.assignedToId,
      };
    } else if (role === UserRole.SUPERVISOR || role === UserRole.COACH) {
      data = {
        ...baseData,
        assignedToId: body.assignedToId
          ? Number(body.assignedToId)
          : existing.assignedToId,
        customerStatus: body.customerStatus || existing.customerStatus,
      };
    } else {
      data = {
        ...baseData,
        customerStatus: body.customerStatus || existing.customerStatus,
      };
    }

    data = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    if (body.phone1 && body.phone1 !== existing.phone1) {
      const dup = await findDuplicatePhone(leadId, body.phone1);
      if (dup)
        return conflict(
          dup.phone1 === body.phone1
            ? "El teléfono ya está registrado"
            : "El teléfono 1 ya está registrado como teléfono 2 en otro cliente",
        );
    }

    if (body.phone2 && body.phone2 !== existing.phone2) {
      const dup = await findDuplicatePhone(leadId, body.phone2);
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
      where: { id: leadId },
      data,
      include: {
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const changedFields = (Object.keys(data) as Array<keyof typeof data>).filter(
      (key) => {
        const prev = (existing as Record<string, unknown>)[key];
        const next = data[key];
        if (prev instanceof Date && next instanceof Date)
          return prev.getTime() !== next.getTime();
        return prev !== next;
      },
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
