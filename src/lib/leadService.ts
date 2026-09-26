import { prisma } from "@/lib/prisma";

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
