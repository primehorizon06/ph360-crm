import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden, badRequest } from "@/lib/api";

type SessionUser = {
  id: string;
  role: string;
  companyId?: number;
};

export const GET = withAuth(async (req, session) => {
  const user = session.user as unknown as SessionUser;
  const { searchParams } = new URL(req.url);

  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const quincena = parseInt(searchParams.get("quincena") ?? "1");
  const companyId = searchParams.get("companyId");
  const teamId = searchParams.get("teamId");

  const scopedCompanyId =
    user.role === "ADMIN"
      ? companyId
        ? parseInt(companyId)
        : undefined
      : user.companyId;

  const goals = await prisma.goal.findMany({
    where: {
      year,
      month,
      quincena,
      ...(scopedCompanyId
        ? {
            OR: [
              { companyId: scopedCompanyId },
              { team: { companyId: scopedCompanyId } },
              { user: { companyId: scopedCompanyId } },
            ],
          }
        : {}),
      ...(teamId ? { teamId: parseInt(teamId) } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      team: { select: { id: true, name: true, companyId: true } },
      user: { select: { id: true, name: true, teamId: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const companies =
    user.role === "ADMIN"
      ? await prisma.company.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const teams = await prisma.team.findMany({
    where: scopedCompanyId ? { companyId: scopedCompanyId } : {},
    select: {
      id: true,
      name: true,
      companyId: true,
      users: {
        where: { role: "AGENT", active: true },
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ goals, companies, teams });
});

export const POST = withAuth(async (req, session) => {
  const user = session.user as unknown as SessionUser;
  if (!["ADMIN", "SUPERVISOR"].includes(user.role)) return forbidden();

  const body = await req.json();
  const { year, month, quincena, amount, companyId, teamId, userId } = body;

  const scopeCount = [companyId, teamId, userId].filter(Boolean).length;
  if (scopeCount !== 1)
    return badRequest("Debe definir exactamente un scope: companyId, teamId o userId");
  if (!amount || amount <= 0) return badRequest("El monto debe ser mayor a 0");

  const createdById = parseInt(user.id ?? "0");

  if (companyId) {
    if (user.role === "SUPERVISOR" && user.companyId !== parseInt(companyId))
      return forbidden();
  }

  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: parseInt(teamId) } });
    if (!team) return badRequest("Equipo no encontrado");
    if (user.role === "SUPERVISOR" && team.companyId !== user.companyId)
      return forbidden();

    const companyGoal = await prisma.goal.findFirst({
      where: { year, month, quincena, companyId: team.companyId },
    });
    if (!companyGoal) return badRequest("Primero debe definir la meta de la franquicia");

    const otherTeamGoals = await prisma.goal.findMany({
      where: {
        year,
        month,
        quincena,
        team: { companyId: team.companyId },
        teamId: { not: parseInt(teamId) },
      },
    });
    const otherTeamsSum = otherTeamGoals.reduce((s, g) => s + Number(g.amount), 0);
    const available = Number(companyGoal.amount) - otherTeamsSum;

    if (amount > available)
      return badRequest(`El monto excede lo disponible. Disponible: $${available.toFixed(2)}`);
  }

  if (userId) {
    const agent = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!agent || !agent.teamId) return badRequest("Asesor no encontrado o sin equipo");

    const teamGoal = await prisma.goal.findFirst({
      where: { year, month, quincena, teamId: agent.teamId },
    });
    if (!teamGoal) return badRequest("Primero debe definir la meta del equipo");

    const otherAgentGoals = await prisma.goal.findMany({
      where: {
        year,
        month,
        quincena,
        user: { teamId: agent.teamId },
        userId: { not: parseInt(userId) },
      },
    });
    const otherAgentsSum = otherAgentGoals.reduce((s, g) => s + Number(g.amount), 0);
    const available = Number(teamGoal.amount) - otherAgentsSum;

    if (amount > available)
      return badRequest(
        `El monto excede lo disponible para este equipo. Disponible: $${available.toFixed(2)}`,
      );
  }

  const whereClause = companyId
    ? {
        year_month_quincena_companyId: {
          year,
          month,
          quincena,
          companyId: parseInt(companyId),
        },
      }
    : teamId
      ? {
          year_month_quincena_teamId: {
            year,
            month,
            quincena,
            teamId: parseInt(teamId),
          },
        }
      : {
          year_month_quincena_userId: {
            year,
            month,
            quincena,
            userId: parseInt(userId),
          },
        };

  const goal = await prisma.goal.upsert({
    where: whereClause as never,
    update: { amount, createdById },
    create: {
      year,
      month,
      quincena,
      amount,
      companyId: companyId ? parseInt(companyId) : null,
      teamId: teamId ? parseInt(teamId) : null,
      userId: userId ? parseInt(userId) : null,
      createdById,
    },
  });

  return NextResponse.json({ goal });
});

export const DELETE = withAuth(async (req, session) => {
  const user = session.user as unknown as SessionUser;
  if (!["ADMIN", "SUPERVISOR"].includes(user.role)) return forbidden();

  const { id } = await req.json();
  if (!id) return badRequest("ID requerido");

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) return badRequest("Meta no encontrada");

  if (user.role === "SUPERVISOR") {
    const isOwn =
      goal.companyId === user.companyId ||
      (goal.teamId &&
        (await prisma.team.findFirst({
          where: { id: goal.teamId, companyId: user.companyId },
        }))) ||
      (goal.userId &&
        (await prisma.user.findFirst({
          where: { id: goal.userId, companyId: user.companyId },
        })));
    if (!isOwn) return forbidden();
  }

  if (goal.companyId) {
    const teamGoals = await prisma.goal.count({
      where: {
        year: goal.year,
        month: goal.month,
        quincena: goal.quincena,
        team: { companyId: goal.companyId },
      },
    });
    if (teamGoals > 0)
      return badRequest(
        "No se puede eliminar la meta de franquicia mientras existan metas de equipos para este período",
      );
  }

  if (goal.teamId) {
    const agentGoals = await prisma.goal.count({
      where: {
        year: goal.year,
        month: goal.month,
        quincena: goal.quincena,
        user: { teamId: goal.teamId },
      },
    });
    if (agentGoals > 0)
      return badRequest(
        "No se puede eliminar la meta de equipo mientras existan metas de asesores para este período",
      );
  }

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
