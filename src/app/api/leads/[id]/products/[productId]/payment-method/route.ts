import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findLeadProduct } from "@/lib/leadService";
import { accountDetailsSchema, cardDetailsSchema } from "@/lib/validations/product";
import { encryptRandom, decrypt } from "@/lib/crypto";
import { logAudit, getRequestMeta } from "@/lib/audit";

const ENCRYPTED_FIELDS = ["accountNumber", "routingNumber"] as const;

// Datos del método de pago de un producto. El tipo (tarjeta o cuenta) no
// cambia; solo sus datos. Número de cuenta y de ruta se guardan cifrados.
export const PATCH = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();
    if (!canManagePayments(session.user.role)) return forbidden();

    const existing = await prisma.paymentMethod.findUnique({
      where: { productId: match.product.id },
    });
    if (!existing) return notFound("El producto no tiene método de pago");

    const body = await req.json();
    const parsed =
      existing.type === "CUENTA"
        ? accountDetailsSchema.safeParse(body)
        : cardDetailsSchema.safeParse(body);
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

    const plain: Record<string, string> = parsed.data;

    // Se comparan los valores en claro: el cifrado es aleatorio, así que el
    // texto cifrado cambia aunque el número sea el mismo.
    const changedFields = Object.keys(plain).filter((key) => {
      const current = (existing as Record<string, unknown>)[key];
      const previous = (ENCRYPTED_FIELDS as readonly string[]).includes(key)
        ? decrypt(current as string | null)
        : current;
      return previous !== plain[key];
    });

    if (changedFields.length === 0) return badRequest("No hay cambios para guardar");

    const data = Object.fromEntries(
      changedFields.map((key) => [
        key,
        (ENCRYPTED_FIELDS as readonly string[]).includes(key)
          ? encryptRandom(plain[key])
          : plain[key],
      ]),
    );

    const updated = await prisma.paymentMethod.update({
      where: { id: existing.id },
      data,
    });

    await logAudit({
      action: "PAYMENT_METHOD_UPDATED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Product",
      entityId: match.product.id,
      metadata: { leadId: match.lead.id, paymentType: existing.type, changedFields },
      ...getRequestMeta(req),
    });

    return NextResponse.json({
      ...updated,
      accountNumber: decrypt(updated.accountNumber),
      routingNumber: decrypt(updated.routingNumber),
    });
  },
);
