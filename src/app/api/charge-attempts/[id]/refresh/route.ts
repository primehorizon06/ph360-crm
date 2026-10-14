import { NextResponse } from "next/server";
import { withAuthParams, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findAttemptContext, refreshAttempt } from "@/lib/payments/charges";

// Consulta en SOAR el estado actual del débito. Los webhooks y la conciliación
// lo harán solos; esto permite forzarlo desde la cola de cobros.
export const POST = withAuthParams<{ id: string }>(async (_req, session, { id }) => {
  const ctx = await findAttemptContext(Number(id));
  if (!ctx) return notFound("Cobro no encontrado");

  if (!canAccessLead(session.user, ctx.lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  return NextResponse.json(await refreshAttempt(ctx.id));
});
