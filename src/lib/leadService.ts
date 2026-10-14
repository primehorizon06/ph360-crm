import { InstallmentStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { isCollectableProduct } from "@/lib/collections";

const MAX_INT4 = 2_147_483_647;

const DUPLICATE_OWNER_SELECT = {
  company: { select: { name: true } },
} as const;

type DuplicateOwner = {
  company: { name: string };
};

export function findDuplicatePhone(excludeLeadId: number | null, phone: string) {
  return prisma.lead.findFirst({
    where: {
      ...(excludeLeadId !== null ? { id: { not: excludeLeadId } } : {}),
      OR: [{ phone1: phone }, { phone2: phone }],
    },
    select: { phone1: true, ...DUPLICATE_OWNER_SELECT },
  });
}

export function findDuplicateSsn(excludeLeadId: number | null, encryptedSsn: string) {
  return prisma.lead.findFirst({
    where: {
      ...(excludeLeadId !== null ? { id: { not: excludeLeadId } } : {}),
      ssn: encryptedSsn,
    },
    select: DUPLICATE_OWNER_SELECT,
  });
}

export function describeDuplicateOwner(dup: DuplicateOwner) {
  return {
    franquicia: dup.company.name,
  };
}

export async function findLeadProduct(leadId: number, productId: number) {
  const [lead, product] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.product.findUnique({
      where: { id: productId },
      include: { catalog: true },
    }),
  ]);
  if (!lead || !product || product.leadId !== leadId) return null;
  return { lead, product };
}

/** Campos del lead que necesitan canAccessLead() y la auditoría. */
export const LEAD_ACCESS_SELECT = {
  id: true,
  companyId: true,
  teamId: true,
  assignedToId: true,
} satisfies Prisma.LeadSelect;

// Cuota con lo necesario para validar acceso (lead) y si se puede gestionar:
// producto aprobado (editar) o aprobado y activo (cobrar, suspender,
// reprogramar).
export async function findInstallmentContext(installmentId: number) {
  if (!Number.isInteger(installmentId)) return null;
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: {
      paymentPlan: {
        select: {
          productId: true,
          product: {
            select: {
              status: true,
              approval: { select: { status: true } },
              lead: { select: LEAD_ACCESS_SELECT },
            },
          },
        },
      },
    },
  });
  if (!installment) return null;
  const { product, productId } = installment.paymentPlan;
  return {
    installment,
    productId,
    lead: product.lead,
    productApproved: product.approval?.status === "APPROVED",
    productCollectable: isCollectableProduct(product),
  };
}

/**
 * Actualiza una cuota solo si sigue en el estado que se leyó. Evita pisar un
 * cambio concurrente, por ejemplo un cobro que la pasó a PROCESSING mientras
 * alguien la suspendía o reprogramaba.
 */
export async function updateInstallmentIfStatus(
  id: number,
  expected: InstallmentStatus,
  data: Prisma.InstallmentUpdateManyMutationInput,
) {
  const { count } = await prisma.installment.updateMany({ where: { id, status: expected }, data });
  if (count === 0)
    throw new UserFacingError("La cuota cambió mientras tanto; recarga e inténtalo de nuevo", 409);
  return prisma.installment.findUniqueOrThrow({ where: { id } });
}

/**
 * Filtro de búsqueda de leads por nombre, teléfono (también solo dígitos) y,
 * opcionalmente, email o ID exacto.
 */
export async function buildLeadSearchFilter(
  search: string,
  { matchEmail = false, matchId = false } = {},
): Promise<Prisma.LeadWhereInput> {
  const phoneIds = await findLeadIdsByPhoneDigits(search);
  const idQuery = Number(search);
  return {
    OR: [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone1: { contains: search } },
      ...(matchEmail ? [{ email: { contains: search, mode: "insensitive" as const } }] : []),
      ...(phoneIds.length ? [{ id: { in: phoneIds } }] : []),
      ...(matchId && Number.isInteger(idQuery) && idQuery > 0 && idQuery <= MAX_INT4
        ? [{ id: idQuery }]
        : []),
    ],
  };
}

export async function isProductApproved(productId: number) {
  const approval = await prisma.productApproval.findUnique({
    where: { productId },
    select: { status: true },
  });
  return approval?.status === "APPROVED";
}

// El responsable de un recordatorio debe ser un usuario activo de la misma
// franquicia del lead, o un rol global (ADMIN o Customer Service Holding, que
// ya ven todas); así un recordatorio no expone el lead fuera de quienes pueden verlo.
export async function isValidReminderAssignee(assigneeId: number, leadCompanyId: number) {
  if (!Number.isInteger(assigneeId)) return false;
  const assignee = await prisma.user.findFirst({
    where: {
      id: assigneeId,
      active: true,
      OR: [
        { companyId: leadCompanyId },
        { role: { in: [Role.ADMIN, Role.CUSTOMER_SERVICE_HOLDING] } },
      ],
    },
    select: { id: true },
  });
  return !!assignee;
}

export function parseInstallments(raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const installments = raw.map(
    (i: { number: number; date: string; amount: string | number }) => ({
      number: Number(i.number),
      date: new Date(i.date),
      amount: Number(i.amount),
    }),
  );
  const valid = installments.every(
    (i) =>
      Number.isInteger(i.number) &&
      !Number.isNaN(i.date.getTime()) &&
      Number.isFinite(i.amount) &&
      i.amount > 0,
  );
  return valid ? installments : null;
}

const MIN_PHONE_DIGITS = 4;

export async function findLeadIdsByPhoneDigits(query: string): Promise<number[]> {
  if (!/^[\d\s()+\-.]+$/.test(query)) return [];
  const digits = query.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS) return [];

  const pattern = `%${digits}%`;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM "Lead"
    WHERE regexp_replace(phone1, '[^0-9]', '', 'g') LIKE ${pattern}
       OR regexp_replace(coalesce(phone2, ''), '[^0-9]', '', 'g') LIKE ${pattern}
  `;
  return rows.map((r) => r.id);
}
