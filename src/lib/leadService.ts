import { prisma } from "@/lib/prisma";

export function findDuplicatePhone(leadId: number, phone: string) {
  return prisma.lead.findFirst({
    where: { id: { not: leadId }, OR: [{ phone1: phone }, { phone2: phone }] },
    select: { phone1: true },
  });
}
