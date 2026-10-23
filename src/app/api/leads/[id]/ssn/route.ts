import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, notFound } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { decrypt } from "@/lib/crypto";
import { logAudit, auditActor, getRequestMeta } from "@/lib/audit";

export const POST = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(id) },
      select: { id: true, ssn: true, companyId: true, teamId: true, assignedToId: true },
    });

    if (!lead) return notFound("Lead no encontrado");
    if (!canAccessLead(session.user, lead)) return forbidden();
    if (!lead.ssn) return notFound("El lead no tiene seguro social registrado");

    await logAudit({
      action: "SSN_REVEALED",
      actor: auditActor(session.user),
      entityType: "Lead",
      entityId: lead.id,
      ...getRequestMeta(req),
    });

    return NextResponse.json(
      { ssn: decrypt(lead.ssn) },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
);
