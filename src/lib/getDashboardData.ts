import { prisma } from "@/lib/prisma";
import { UserRole } from "@/utils/constants/roles";
import { Prisma } from "@prisma/client";
import { DashboardData } from "@/utils/interfaces/dashboard";

export interface DashboardUser {
  id: string;
  role: string;
  companyId?: number;
  teamId?: number;
}

export interface DashboardParams {
  year: number;
  month: number;
  quincena: 1 | 2;
  companyId: string; // "all" or numeric string
}

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

function buildRevenueWhere(
  companyId?: number,
  teamId?: number,
  agentId?: number,
) {
  return {
    status: "PAID" as const,
    paymentPlan: {
      product: {
        lead: {
          type: "customer" as const,
          ...(companyId ? { companyId } : {}),
          ...(teamId ? { teamId } : {}),
          ...(agentId ? { assignedToId: agentId } : {}),
        },
      },
    },
  };
}

async function resolveGoalHistorico(
  hist: {
    year: number;
    month: number;
    quincena: number;
    amount: Prisma.Decimal;
  }[],
  baseWhere: ReturnType<typeof buildRevenueWhere>,
) {
  if (!hist.length) return [];

  const ranges = hist.map((g) =>
    getQuincenaRange(g.year, g.month, g.quincena as 1 | 2),
  );
  const gte = new Date(Math.min(...ranges.map((r) => r.gte.getTime())));
  const lte = new Date(Math.max(...ranges.map((r) => r.lte.getTime())));

  const installments = await prisma.installment.findMany({
    where: { ...baseWhere, paidAt: { gte, lte } },
    select: { paidAt: true, amount: true },
  });

  return hist.map((g) => {
    const r = getQuincenaRange(g.year, g.month, g.quincena as 1 | 2);
    const revenue = installments
      .filter(
        (i) => i.paidAt !== null && i.paidAt >= r.gte && i.paidAt <= r.lte,
      )
      .reduce((sum, i) => sum + Number(i.amount), 0);
    return {
      year: g.year,
      month: g.month,
      quincena: g.quincena,
      amount: Number(g.amount),
      revenue,
    };
  });
}

export async function getDashboardData(
  user: DashboardUser,
  params: DashboardParams,
): Promise<DashboardData> {
  const { year, month, quincena } = params;
  const userId = parseInt(user.id);

  let scopedCompanyId: number | undefined;
  let scopedTeamId: number | undefined;
  let scopedAgentId: number | undefined;

  if (user.role === UserRole.ADMIN) {
    if (params.companyId && params.companyId !== "all")
      scopedCompanyId = parseInt(params.companyId);
  } else if (user.role === UserRole.SUPERVISOR) {
    scopedCompanyId = user.companyId;
  } else if (user.role === UserRole.COACH) {
    scopedCompanyId = user.companyId;
    scopedTeamId = user.teamId;
  } else if (user.role === UserRole.AGENT) {
    scopedCompanyId = user.companyId;
    scopedTeamId = user.teamId;
    scopedAgentId = userId;
  }

  const leadFilter = {
    ...(scopedCompanyId ? { companyId: scopedCompanyId } : {}),
    ...(scopedTeamId ? { teamId: scopedTeamId } : {}),
    ...(scopedAgentId ? { assignedToId: scopedAgentId } : {}),
  };

  const dateRange = getQuincenaRange(year, month, quincena);
  const prevDateRange = getPrevQuincenaRange(year, month, quincena);
  const todayRange = getTodayRange();

  const revenueWhere = buildRevenueWhere(
    scopedCompanyId,
    scopedTeamId,
    scopedAgentId,
  );
  const prevRevenueWhere = buildRevenueWhere(
    scopedCompanyId,
    scopedTeamId,
    scopedAgentId,
  );

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
    prisma.lead.count({ where: { ...leadFilter, createdAt: dateRange } }),
    prisma.lead.count({ where: { ...leadFilter, createdAt: prevDateRange } }),
    prisma.lead.count({
      where: { ...leadFilter, type: "customer", convertedAt: dateRange },
    }),
    prisma.lead.count({
      where: { ...leadFilter, type: "customer", convertedAt: prevDateRange },
    }),
    prisma.lead.count({
      where: { ...leadFilter, type: "customer", convertedAt: todayRange },
    }),
    prisma.installment.aggregate({
      where: { ...revenueWhere, paidAt: dateRange },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { ...prevRevenueWhere, paidAt: prevDateRange },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { ...revenueWhere, paidAt: todayRange },
      _sum: { amount: true },
    }),
    prisma.installment.findMany({
      where: { ...revenueWhere, paidAt: dateRange },
      select: { paidAt: true, amount: true },
    }),
    prisma.installment.count({
      where: {
        status: "FAILED",
        paymentPlan: { product: { lead: leadFilter } },
      },
    }),
    prisma.lead.count({ where: { ...leadFilter, status: "suspended" } }),
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
      where: { ...leadFilter, type: "customer", customerStatus: { not: null } },
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
      where: { ...leadFilter, createdAt: dateRange },
      select: { createdAt: true },
    }),
    user.role === UserRole.ADMIN
      ? prisma.company.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([] as { id: number; name: string }[]),
  ]);

  const rankingLeadFilter =
    user.role === UserRole.AGENT || user.role === UserRole.COACH
      ? {
          ...(scopedCompanyId ? { companyId: scopedCompanyId } : {}),
          ...(scopedTeamId ? { teamId: scopedTeamId } : {}),
        }
      : leadFilter;

  const rankingRevenueWhere = buildRevenueWhere(
    scopedCompanyId,
    scopedTeamId,
    undefined,
  );

  const instByAgent = await prisma.installment.findMany({
    where: { ...rankingRevenueWhere, paidAt: dateRange },
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
    { id: number; name: string; recaudo: number; conversiones: number }
  > = {};
  for (const inst of instByAgent) {
    const lead = inst.paymentPlan?.product?.lead;
    if (!lead) continue;
    const id = lead.assignedToId;
    if (!agentMap[id])
      agentMap[id] = {
        id,
        name: lead.assignedTo.name,
        recaudo: 0,
        conversiones: 0,
      };
    agentMap[id].recaudo += Number(inst.amount);
  }

  const convByAgent = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: { ...rankingLeadFilter, type: "customer", convertedAt: dateRange },
    _count: { id: true },
  });

  const missingAgentIds = convByAgent
    .filter((c) => !agentMap[c.assignedToId])
    .map((c) => c.assignedToId);
  const missingAgents = missingAgentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: missingAgentIds } },
        select: { id: true, name: true },
      })
    : [];
  const missingAgentIndex = Object.fromEntries(
    missingAgents.map((a) => [a.id, a]),
  );

  for (const c of convByAgent) {
    if (agentMap[c.assignedToId]) {
      agentMap[c.assignedToId].conversiones = c._count.id;
    } else {
      const info = missingAgentIndex[c.assignedToId];
      if (info)
        agentMap[info.id] = {
          id: info.id,
          name: info.name,
          recaudo: 0,
          conversiones: c._count.id,
        };
    }
  }

  const agentRanking = Object.values(agentMap).sort(
    (a, b) => b.recaudo - a.recaudo,
  );

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

  let goalAmount: number | null = null;
  let goalHistorico: {
    year: number;
    month: number;
    quincena: number;
    amount: number;
    revenue: number;
  }[] = [];

  if (
    user.role === UserRole.SUPERVISOR ||
    (user.role === UserRole.ADMIN && scopedCompanyId)
  ) {
    const g = await prisma.goal.findFirst({
      where: { year, month, quincena, companyId: scopedCompanyId },
    });
    goalAmount = g ? Number(g.amount) : null;
    const hist = await prisma.goal.findMany({
      where: { companyId: scopedCompanyId },
      orderBy: [{ year: "desc" }, { month: "desc" }, { quincena: "desc" }],
      take: 6,
    });
    goalHistorico = await resolveGoalHistorico(
      hist,
      buildRevenueWhere(scopedCompanyId),
    );
  } else if (user.role === UserRole.COACH && scopedTeamId) {
    const g = await prisma.goal.findFirst({
      where: { year, month, quincena, teamId: scopedTeamId },
    });
    goalAmount = g ? Number(g.amount) : null;
    const hist = await prisma.goal.findMany({
      where: { teamId: scopedTeamId },
      orderBy: [{ year: "desc" }, { month: "desc" }, { quincena: "desc" }],
      take: 6,
    });
    goalHistorico = await resolveGoalHistorico(
      hist,
      buildRevenueWhere(undefined, scopedTeamId),
    );
  } else if (user.role === UserRole.AGENT && scopedAgentId) {
    const g = await prisma.goal.findFirst({
      where: { year, month, quincena, userId: scopedAgentId },
    });
    goalAmount = g ? Number(g.amount) : null;
    const hist = await prisma.goal.findMany({
      where: { userId: scopedAgentId },
      orderBy: [{ year: "desc" }, { month: "desc" }, { quincena: "desc" }],
      take: 6,
    });
    goalHistorico = await resolveGoalHistorico(
      hist,
      buildRevenueWhere(undefined, undefined, scopedAgentId),
    );
  }

  let recaudoPorFranquicia: {
    companyId: number;
    name: string;
    recaudo: number;
  }[] = [];
  if (user.role === UserRole.ADMIN && !scopedCompanyId) {
    const franqInst = await prisma.installment.findMany({
      where: {
        status: "PAID" as const,
        paidAt: dateRange,
        paymentPlan: { product: { lead: { type: "customer" as const } } },
      },
      select: {
        amount: true,
        paymentPlan: {
          select: {
            product: { select: { lead: { select: { companyId: true } } } },
          },
        },
      },
    });
    const recaudoByCompany = Object.fromEntries(
      companies.map((c) => [
        c.id,
        { companyId: c.id, name: c.name, recaudo: 0 },
      ]),
    );
    for (const inst of franqInst) {
      const cid = inst.paymentPlan?.product?.lead?.companyId;
      if (cid !== undefined && recaudoByCompany[cid])
        recaudoByCompany[cid].recaudo += Number(inst.amount);
    }
    recaudoPorFranquicia = Object.values(recaudoByCompany).sort(
      (a, b) => b.recaudo - a.recaudo,
    );
  }

  return {
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
    meta: {
      year,
      month,
      quincena,
      companyId: scopedCompanyId ?? null,
      teamId: scopedTeamId ?? null,
      agentId: scopedAgentId ?? null,
      role: user.role,
      currentUserId: userId,
    },
    goalAmount,
    goalHistorico,
  };
}
