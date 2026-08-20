import { prisma } from "@/lib/prisma";
import { UserRole } from "@/utils/constants/roles";

const DUPLICATE_OWNER_SELECT = {
  assignedTo: {
    select: {
      name: true,
      team: {
        select: {
          name: true,
          users: {
            where: { role: UserRole.COACH },
            select: { name: true },
            take: 1,
          },
        },
      },
    },
  },
  company: { select: { name: true } },
} as const;

type DuplicateOwner = {
  assignedTo: {
    name: string;
    team: { name: string; users: { name: string }[] } | null;
  };
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
    agente: dup.assignedTo.name,
    coach: dup.assignedTo.team?.users[0]?.name ?? null,
    equipo: dup.assignedTo.team?.name ?? null,
    franquicia: dup.company.name,
  };
}
