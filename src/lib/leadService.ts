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
    prisma.product.findUnique({ where: { id: productId } }),
  ]);
  if (!lead || !product || product.leadId !== leadId) return null;
  return { lead, product };
}
