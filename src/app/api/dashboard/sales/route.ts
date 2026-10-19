import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, badRequest, forbidden } from "@/lib/api";
import { buildScopeFilter, canManagePayments, isGlobalRole } from "@/lib/permissions";
import { quincenaRange } from "@/lib/businessDays";

// Ventas por franquicia en la quincena (admin y Customer Service Holding).
// Una venta es un producto aprobado en la quincena (approvedAt) que sigue
// activo: los suspendidos no cuentan. Incluye las franquicias sin ventas, en
// el orden en que se crearon (la primera es la oficina central). Con
// companyId (filtro del dashboard), solo esa franquicia.
export const GET = withAuth(async (req, session) => {
  const user = session.user;
  if (!canManagePayments(user.role)) return forbidden();
  const scopeFilter = buildScopeFilter(user);
  if (!scopeFilter) return forbidden();

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  const quincena = Number(url.searchParams.get("quincena"));
  if (!Number.isInteger(year) || month < 1 || month > 12 || (quincena !== 1 && quincena !== 2))
    return badRequest("Período inválido");

  const range = quincenaRange(year, month, quincena as 1 | 2);
  const companyId = Number(url.searchParams.get("companyId")) || undefined;
  // Un rol de franquicia solo ve la suya, aunque pida otra.
  const ownCompany = isGlobalRole(user.role) ? undefined : Number(user.companyId);
  if (ownCompany && companyId && companyId !== ownCompany) return forbidden();
  const onlyCompany = companyId ?? ownCompany;

  const [companies, approvals] = await Promise.all([
    prisma.company.findMany({
      where: { active: true, ...(onlyCompany ? { id: onlyCompany } : {}) },
      select: { id: true, name: true, logo: true },
      orderBy: { id: "asc" },
    }),
    prisma.productApproval.findMany({
      where: {
        status: "APPROVED",
        approvedAt: range,
        product: { status: "ACTIVE" },
        lead: { AND: [scopeFilter, ...(onlyCompany ? [{ companyId: onlyCompany }] : [])] },
      },
      select: { lead: { select: { companyId: true } } },
    }),
  ]);

  const counts = new Map<number, number>();
  for (const { lead } of approvals) counts.set(lead.companyId, (counts.get(lead.companyId) ?? 0) + 1);

  return NextResponse.json(
    companies.map((c) => ({ id: c.id, name: c.name, logo: c.logo, sales: counts.get(c.id) ?? 0 })),
  );
});
