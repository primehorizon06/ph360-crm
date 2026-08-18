import { NextRequest } from "next/server";
import { AuditAction, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface AuditActor {
  id: string | number;
  role: string;
  name?: string | null;
}

interface LogAuditParams {
  action: AuditAction;
  actor?: AuditActor | null;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

// Para usar en API routes (withAuth), donde req es un NextRequest real.
export function getRequestMeta(req: NextRequest): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip");
  return { ip, userAgent: req.headers.get("user-agent") };
}

// Nunca debe fallar la operación de negocio por un error de auditoría: se
// registra el error y se sigue. Tampoco debe recibir valores en claro de
// campos sensibles (ssn, cuentas bancarias) en `metadata` — solo nombres de
// campo o metadatos no sensibles.
export async function logAudit({
  action,
  actor,
  entityType,
  entityId,
  metadata,
  ip,
  userAgent,
}: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: actor ? Number(actor.id) : null,
        actorRole: actor ? (actor.role as Role) : null,
        actorName: actor?.name ?? null,
        entityType,
        entityId: entityId ?? null,
        metadata: metadata as never,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}
