import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { isGlobalCustomerService } from "@/lib/permissions";

// Agentes activos que el usuario puede usar como filtro, con el mismo alcance
// que sus leads: ADMIN y Customer Service Holding, todos (o los de una
// franquicia con ?companyId=); SUPERVISOR y Customer Service de franquicia, los
// de su franquicia; COACH, los de su equipo; AGENT, solo él.
export const GET = withAuth(async (req, session) => {
  const user = session.user;
  const companyId = Number(new URL(req.url).searchParams.get("companyId")) || undefined;

  let scope: Prisma.UserWhereInput;
  if (user.role === UserRole.ADMIN || isGlobalCustomerService(user.role)) {
    scope = companyId ? { companyId } : {};
  } else if (user.role === UserRole.SUPERVISOR || user.role === UserRole.CUSTOMER_SERVICE) {
    scope = { companyId: Number(user.companyId) };
  } else if (user.role === UserRole.COACH) {
    scope = { teamId: Number(user.teamId) };
  } else {
    scope = { id: Number(user.id) };
  }

  const agents = await prisma.user.findMany({
    where: { ...scope, role: UserRole.AGENT, active: true },
    select: { id: true, name: true, company: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(agents);
});
