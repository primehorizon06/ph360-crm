import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, badRequest, forbidden } from "@/lib/api";
import { buildScopeFilter, canManagePayments } from "@/lib/permissions";
import { quincenaRange } from "@/lib/businessDays";
import { collectableProductFilter } from "@/lib/collections";
import {
  isPaymentGroup,
  PAYMENT_GROUPS,
  PaymentGroup,
} from "@/components/dashboard/paymentGroups";

const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;


/**
 * Pagos de cada grupo en la quincena: confirmados sin enviar (por fecha del
 * pago), en proceso en SOAR (por fecha del pago), aprobados (por fecha de pago
 * efectivo) y caídos — suspendidos o devueltos — (por fecha del pago).
 */
function groupFilter(group: PaymentGroup, range: Prisma.DateTimeFilter): Prisma.InstallmentWhereInput {
  switch (group) {
    case "transfer":
      return { status: "PENDING", confirmedAt: { not: null }, date: range };
    case "processing":
      return { status: "PROCESSING", date: range };
    case "approved":
      return { status: "PAID", paidAt: range };
    case "fallen":
      return { status: { in: ["SUSPENDED", "FAILED"] }, date: range };
  }
}

// Resumen de pagos del dashboard (admin y Customer Service Holding): total por
// grupo en la quincena elegida y el detalle del grupo seleccionado, con
// filtros de franquicia, asesor y producto que aplican a ambos.
export const GET = withAuth(async (req, session) => {
  const user = session.user;
  if (!canManagePayments(user.role)) return forbidden();

  const scopeFilter = buildScopeFilter(user);
  if (!scopeFilter) return forbidden();

  const url = new URL(req.url);
  const group = url.searchParams.get("group") ?? "transfer";
  if (!isPaymentGroup(group)) return badRequest("Grupo inválido");

  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  const quincena = Number(url.searchParams.get("quincena"));
  if (!Number.isInteger(year) || month < 1 || month > 12 || (quincena !== 1 && quincena !== 2))
    return badRequest("Período inválido");

  const companyId = Number(url.searchParams.get("companyId")) || undefined;
  const agentId = Number(url.searchParams.get("agentId")) || undefined;
  const catalogId = Number(url.searchParams.get("catalogId")) || undefined;
  // rows=0: solo los totales de los cards (dashboard), sin la tabla.
  const withRows = url.searchParams.get("rows") !== "0";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    LIMIT_MAX,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? String(LIMIT_DEFAULT)) || LIMIT_DEFAULT),
  );

  const leadFilter: Prisma.LeadWhereInput = {
    AND: [
      scopeFilter,
      ...(companyId ? [{ companyId }] : []),
      ...(agentId ? [{ assignedToId: agentId }] : []),
    ],
  };
  // Transfer solo con productos activos (lo que se cobra), igual que Cobros.
  const baseFor = (g: PaymentGroup) =>
    collectableProductFilter(leadFilter, { activeOnly: g === "transfer", catalogId });
  const range = quincenaRange(year, month, quincena as 1 | 2);
  const whereFor = (g: PaymentGroup) => ({ ...baseFor(g), ...groupFilter(g, range) });

  const [totals, rows, total] = await Promise.all([
    Promise.all(
      PAYMENT_GROUPS.map((g) =>
        prisma.installment.aggregate({
          where: whereFor(g),
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ),
    ),
    withRows
      ? prisma.installment.findMany({
          where: whereFor(group),
          orderBy: group === "approved" ? [{ paidAt: "desc" }, { id: "asc" }] : [{ date: "asc" }, { id: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            date: true,
            amount: true,
            status: true,
            paidAt: true,
            suspendReason: true,
            attempts: {
              orderBy: { id: "desc" },
              take: 1,
              select: { failureCode: true, failureReason: true },
            },
            paymentPlan: {
              select: {
                product: {
                  select: {
                    catalog: { select: { name: true, color: true } },
                    lead: {
                      select: {
                        id: true,
                        type: true,
                        firstName: true,
                        lastName: true,
                        company: { select: { name: true } },
                        assignedTo: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : [],
    withRows ? prisma.installment.count({ where: whereFor(group) }) : 0,
  ]);

  return NextResponse.json({
    summary: Object.fromEntries(
      PAYMENT_GROUPS.map((g, i) => [
        g,
        { amount: Number(totals[i]._sum.amount ?? 0), count: totals[i]._count._all },
      ]),
    ),
    data: rows.map(({ paymentPlan, attempts, ...inst }) => ({
      ...inst,
      amount: Number(inst.amount),
      failureCode: attempts[0]?.failureCode ?? null,
      failureReason: attempts[0]?.failureReason ?? null,
      product: paymentPlan.product.catalog,
      lead: paymentPlan.product.lead,
    })),
    total,
    totalPages: Math.ceil(total / limit),
  });
});
