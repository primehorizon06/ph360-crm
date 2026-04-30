// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getQuincenaRange(year: number, month: number, quincena: 1 | 2) {
  if (quincena === 1) {
    return {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month - 1, 15, 23, 59, 59),
    };
  }
  const lastDay = new Date(year, month, 0).getDate();
  return {
    gte: new Date(year, month - 1, 16),
    lte: new Date(year, month - 1, lastDay, 23, 59, 59),
  };
}

function getPrevQuincenaRange(year: number, month: number, quincena: 1 | 2) {
  if (quincena === 1) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const lastDay = new Date(prevYear, prevMonth, 0).getDate();
    return {
      gte: new Date(prevYear, prevMonth - 1, 16),
      lte: new Date(prevYear, prevMonth - 1, lastDay, 23, 59, 59),
    };
  }
  return {
    gte: new Date(year, month - 1, 1),
    lte: new Date(year, month - 1, 15, 23, 59, 59),
  };
}

function getTodayRange() {
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
    lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
  };
}

function buildRevenueWhere(companyId?: number) {
  return {
    status: "PAID" as const,
    paymentPlan: {
      product: {
        lead: {
          type: "customer" as const,
          ...(companyId ? { companyId } : {}),
        },
      },
    },
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(
    searchParams.get("year") ?? String(new Date().getFullYear()),
  );
  const month = parseInt(
    searchParams.get("month") ?? String(new Date().getMonth() + 1),
  );
  const quincena = parseInt(searchParams.get("quincena") ?? "1") as 1 | 2;
  const companyIdParam = searchParams.get("companyId");

  const user = session.user as unknown as {
    id: string;
    role: string;
    companyId?: number;
    teamId?: number;
  };

  let scopedCompanyId: number | undefined;
  if (user.role === "ADMIN") {
    if (companyIdParam && companyIdParam !== "all")
      scopedCompanyId = parseInt(companyIdParam);
  } else {
    scopedCompanyId = user.companyId;
  }

  const companyFilter = scopedCompanyId ? { companyId: scopedCompanyId } : {};
  const leadFilter = scopedCompanyId ? { companyId: scopedCompanyId } : {};

  const dateRange = getQuincenaRange(year, month, quincena);
  const prevDateRange = getPrevQuincenaRange(year, month, quincena);
  const todayRange = getTodayRange();

  const [
    newLeads,
    prevNewLeads,
    conversions,
    prevConversions,
    ventasHoy,
    revenueQ,
    prevRevenueQ,
    revenueDiarioRaw,
    installmentsPaidQ,
    cuotasFallidas,
    leadsSuspendidos,
    installmentStatusDist,
    customerStatusRaw,
    productosRaw,
    pendingApprovals,
    leadsRaw,
    companies,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...companyFilter, createdAt: dateRange } }),
    prisma.lead.count({
      where: { ...companyFilter, createdAt: prevDateRange },
    }),
    prisma.lead.count({
      where: { ...companyFilter, type: "customer", convertedAt: dateRange },
    }),
    prisma.lead.count({
      where: { ...companyFilter, type: "customer", convertedAt: prevDateRange },
    }),
    prisma.lead.count({
      where: { ...companyFilter, type: "customer", convertedAt: todayRange },
    }),
    prisma.installment.aggregate({
      where: { ...buildRevenueWhere(scopedCompanyId), paidAt: dateRange },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { ...buildRevenueWhere(scopedCompanyId), paidAt: prevDateRange },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { ...buildRevenueWhere(scopedCompanyId), paidAt: todayRange },
      _sum: { amount: true },
    }),
    prisma.installment.findMany({
      where: { ...buildRevenueWhere(scopedCompanyId), paidAt: dateRange },
      select: { paidAt: true, amount: true },
    }),
    prisma.installment.count({
      where: {
        status: "FAILED",
        paymentPlan: { product: { lead: leadFilter } },
      },
    }),
    prisma.lead.count({ where: { ...companyFilter, status: "suspended" } }),
    prisma.installment.groupBy({
      by: ["status"],
      where: {
        date: dateRange,
        paymentPlan: { product: { lead: leadFilter } },
      },
      _count: { status: true },
    }),
    prisma.lead.groupBy({
      by: ["customerStatus"],
      where: {
        ...companyFilter,
        type: "customer",
        customerStatus: { not: null },
      },
      _count: { customerStatus: true },
    }),
    prisma.product.groupBy({
      by: ["product"],
      where: { createdAt: dateRange, lead: leadFilter },
      _count: { product: true },
    }),
    prisma.productApproval.count({
      where: { status: "PENDING", lead: leadFilter },
    }),
    prisma.lead.findMany({
      where: { ...companyFilter, createdAt: dateRange },
      select: { createdAt: true },
    }),
    user.role === "ADMIN"
      ? prisma.company.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([] as { id: number; name: string }[]),
  ]);

  // Ranking de asesores por recaudo
  const instByAgent = await prisma.installment.findMany({
    where: { ...buildRevenueWhere(scopedCompanyId), paidAt: dateRange },
    select: {
      amount: true,
      paymentPlan: {
        select: {
          product: {
            select: {
              lead: {
                select: {
                  assignedToId: true,
                  assignedTo: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const agentMap: Record<
    number,
    { name: string; recaudo: number; conversiones: number }
  > = {};
  for (const inst of instByAgent) {
    const lead = inst.paymentPlan?.product?.lead;
    if (!lead) continue;
    const id = lead.assignedToId;
    if (!agentMap[id])
      agentMap[id] = {
        name: lead.assignedTo.name,
        recaudo: 0,
        conversiones: 0,
      };
    agentMap[id].recaudo += Number(inst.amount);
  }

  const convByAgent = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: { ...companyFilter, type: "customer", convertedAt: dateRange },
    _count: { id: true },
  });
  for (const c of convByAgent) {
    if (agentMap[c.assignedToId])
      agentMap[c.assignedToId].conversiones = c._count.id;
  }

  const agentRanking = Object.values(agentMap).sort(
    (a, b) => b.recaudo - a.recaudo,
  );

  // Revenue por día
  const startDay = quincena === 1 ? 1 : 16;
  const endDay = quincena === 1 ? 15 : new Date(year, month, 0).getDate();
  const revMap: Record<number, number> = {};
  const leadDayMap: Record<number, number> = {};
  for (let d = startDay; d <= endDay; d++) {
    revMap[d] = 0;
    leadDayMap[d] = 0;
  }

  for (const inst of installmentsPaidQ) {
    if (!inst.paidAt) continue;
    const d = new Date(inst.paidAt).getDate();
    if (revMap[d] !== undefined) revMap[d] += Number(inst.amount);
  }
  for (const l of leadsRaw) {
    const d = new Date(l.createdAt).getDate();
    if (leadDayMap[d] !== undefined) leadDayMap[d]++;
  }

  // Recaudo por franquicia (solo admin sin filtro)
  let recaudoPorFranquicia: {
    companyId: number;
    name: string;
    recaudo: number;
  }[] = [];
  if (user.role === "ADMIN" && !scopedCompanyId) {
    const franqRecaudos = await Promise.all(
      companies.map(async (c) => {
        const raw = await prisma.installment.aggregate({
          where: { ...buildRevenueWhere(c.id), paidAt: dateRange },
          _sum: { amount: true },
        });
        return {
          companyId: c.id,
          name: c.name,
          recaudo: Number(raw._sum.amount ?? 0),
        };
      }),
    );
    recaudoPorFranquicia = franqRecaudos.sort((a, b) => b.recaudo - a.recaudo);
  }

  return NextResponse.json({
    meta: {
      year,
      month,
      quincena,
      companyId: scopedCompanyId ?? null,
      role: user.role,
    },
    companies,
    kpis: {
      newLeads,
      prevNewLeads,
      conversions,
      prevConversions,
      ventasHoy,
      revenue: Number(revenueQ._sum.amount ?? 0),
      prevRevenue: Number(prevRevenueQ._sum.amount ?? 0),
      revenueDiario: Number(revenueDiarioRaw._sum.amount ?? 0),
      caida: cuotasFallidas + leadsSuspendidos,
      cuotasFallidas,
      leadsSuspendidos,
      pendingApprovals,
    },
    installmentStatusDist: installmentStatusDist.map((r) => ({
      status: r.status,
      count: r._count.status,
    })),
    customerStatus: customerStatusRaw.map((r) => ({
      status: r.customerStatus,
      count: r._count.customerStatus,
    })),
    productos: productosRaw.map((r) => ({
      type: r.product,
      count: r._count.product,
    })),
    agentRanking,
    revenuePorDia: Object.entries(revMap).map(([d, a]) => ({
      day: Number(d),
      amount: a,
    })),
    leadsPerDay: Object.entries(leadDayMap).map(([d, c]) => ({
      day: Number(d),
      count: c,
    })),
    recaudoPorFranquicia,
  });
}
