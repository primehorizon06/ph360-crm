import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden } from "@/lib/api";
import { buildScopeFilter } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { encryptDeterministic } from "@/lib/crypto";
import { findLeadIdsByPhoneDigits } from "@/lib/leadService";
import { formatSsn } from "@/utils/helpers/format";

const RESULTS_LIMIT = 10;
const MAX_INT4 = 2_147_483_647;

export const GET = withAuth(async (req, session) => {
  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() || "";

  if (query.length < 2) return NextResponse.json({ data: [] });

  const user = session.user;
  const scopeFilter = buildScopeFilter(user);
  if (!scopeFilter) return forbidden();

  const orConditions: Prisma.LeadWhereInput[] = [
    { firstName: { contains: query, mode: "insensitive" } },
    { lastName: { contains: query, mode: "insensitive" } },
    { phone1: { contains: query } },
    { phone2: { contains: query } },
    { city: { contains: query, mode: "insensitive" } },
    { ssn: encryptDeterministic(query) },
  ];

  const ssnFormatted = formatSsn(query);
  if (/^[\d\s-]+$/.test(query) && ssnFormatted !== query) {
    orConditions.push({ ssn: encryptDeterministic(ssnFormatted) });
  }

  const phoneIds = await findLeadIdsByPhoneDigits(query);
  if (phoneIds.length) orConditions.push({ id: { in: phoneIds } });

  const idQuery = Number(query);
  if (Number.isInteger(idQuery) && idQuery > 0 && idQuery <= MAX_INT4) {
    orConditions.push({ id: idQuery });
  }

  const where: Prisma.LeadWhereInput = { ...scopeFilter, OR: orConditions };

  const data = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone1: true,
      city: true,
      type: true,
    },
    orderBy: { createdAt: "desc" },
    take: RESULTS_LIMIT,
  });

  return NextResponse.json({ data });
});
