import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, notFound, conflict, badRequest } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import {
  canAccessLead,
  canEditLead,
  isGlobalCustomerService,
} from "@/lib/permissions";
import { encryptDeterministic, decrypt } from "@/lib/crypto";
import { leadObjectSchema } from "@/lib/validations/lead";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { optionalField, optionalDate } from "@/lib/patchFields";
import { maskSsn } from "@/utils/helpers/format";
import {
  findDuplicatePhone,
  findDuplicateSsn,
  resolveLeadOwnership,
  uniqueViolationMessage,
} from "@/lib/leadService";

const leadPatchSchema = leadObjectSchema.partial().passthrough();

export const GET = withAuthParams<{ id: string }>(
  async (_req, session, { id }) => {
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
    if (!canAccessLead(session.user, lead)) return forbidden();

    return NextResponse.json({ ...lead, ssn: maskSsn(decrypt(lead.ssn)) });
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
    if (!canEditLead(role)) return forbidden();

    const ssnProvided = Object.prototype.hasOwnProperty.call(rawBody, "ssn");
    if (ssnProvided && role !== UserRole.ADMIN && existing.ssn && !body.ssn) {
      return forbidden(
        "Solo un administrador puede eliminar el número de seguro social",
      );
    }
    const ssnValue = !ssnProvided
      ? undefined
      : body.ssn
        ? encryptDeterministic(body.ssn)
        : role === UserRole.ADMIN
          ? null
          : existing.ssn;

    const transfer = isGlobalCustomerService(role)
      ? {
          companyId: body.companyId ? Number(body.companyId) : existing.companyId,
          teamId: body.teamId ? Number(body.teamId) : existing.teamId,
          assignedToId: body.assignedToId
            ? Number(body.assignedToId)
            : existing.assignedToId,
        }
      : null;

    const canChangeStatus = role !== UserRole.AGENT;

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
      status: canChangeStatus ? body.status : undefined,
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
    } else if (isGlobalCustomerService(role)) {
      data = {
        ...baseData,
        customerStatus: body.customerStatus || existing.customerStatus,
        phone1: body.phone1,
        ...transfer,
      };
    } else {
      data = { ...baseData };
    }

    data = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    const ownershipChanged = (["assignedToId", "teamId", "companyId"] as const).some(
      (key) => data[key] !== undefined && data[key] !== existing[key],
    );
    if (ownershipChanged) {
      const owner = await resolveLeadOwnership(Number(data.assignedToId ?? existing.assignedToId));
      if (!owner)
        return badRequest("El asesor debe estar activo y pertenecer a una franquicia y un equipo");

      const outOfScope =
        (role === UserRole.SUPERVISOR && owner.companyId !== user.companyId) ||
        (role === UserRole.COACH && owner.teamId !== user.teamId);
      if (outOfScope) return forbidden("No puedes asignar el lead a ese usuario");

      const conflicts = (["teamId", "companyId"] as const).some(
        (key) =>
          data[key] !== undefined && data[key] !== existing[key] && data[key] !== owner[key],
      );
      if (conflicts)
        return badRequest(
          "El equipo y la franquicia del lead los define el asesor asignado; cambia también el asesor",
        );

      data.companyId = owner.companyId;
      data.teamId = owner.teamId;
    }

    if (body.phone1 && body.phone1 !== existing.phone1) {
      const dup = await findDuplicatePhone(leadId, body.phone1);
      if (dup) return conflict("El teléfono ya está registrado");
    }

    if (body.phone2 && body.phone2 !== existing.phone2) {
      const dup = await findDuplicatePhone(leadId, body.phone2);
      if (dup) return conflict("El teléfono 2 ya está registrado");
    }

    if (body.ssn && body.ssn !== decrypt(existing.ssn)) {
      const dup = await findDuplicateSsn(leadId, encryptDeterministic(body.ssn));
      if (dup)
        return conflict("El seguro social ya está registrado");
    }

    let lead;
    try {
      lead = await prisma.lead.update({
        where: { id: leadId },
        data,
        include: {
          company: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      const message = uniqueViolationMessage(error);
      if (message) return conflict(message);
      throw error;
    }

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

    if (lead.companyId !== existing.companyId) {
      await logAudit({
        action: "LEAD_TRANSFERRED",
        actor: { id: user.id, role: user.role, name: user.name },
        entityType: "Lead",
        entityId: lead.id,
        metadata: {
          fromCompanyId: existing.companyId,
          toCompanyId: lead.companyId,
          toTeamId: lead.teamId,
          toAssignedToId: lead.assignedToId,
        },
        ...getRequestMeta(req),
      });
    }

    return NextResponse.json({ ...lead, ssn: maskSsn(decrypt(lead.ssn)) });
  },
);
