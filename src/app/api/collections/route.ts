import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, badRequest, forbidden } from "@/lib/api";
import { buildScopeFilter, canManagePayments } from "@/lib/permissions";
import { buildLeadSearchFilter } from "@/lib/leadService";
import { decrypt } from "@/lib/crypto";
import { isYmd, todayYmd, ymdOf } from "@/lib/businessDays";
import { chargeMemo, isUnconfirmedAttempt, isVoidableAttempt } from "@/lib/payments/status";
import {
  CollectionView,
  VIEW_ORDER,
  collectableProductFilter,
  collectionWindow,
  collectionWindowEnd,
  isCollectionView,
  viewFilter,
  windowDayFor,
} from "@/lib/collections";

const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

// Cola de cobros de Customer Service. Solo muestra cuotas confirmadas o que ya
// pasaron a SOAR. Pestañas:
//   transfer   — confirmadas sin enviar, por fecha de la ventana (hoy, aunque
//                no sea hábil, y las 4 fechas hábiles siguientes; las atrasadas
//                aparecen hoy). La ventana se calcula aquí y no se aceptan otras
//                fechas.
//   approved   — pagadas, por fecha de pago (por defecto hoy).
//   processing — débito enviado o programado.
//   fallen     — suspendidas y devueltas.
export const GET = withAuth(async (req, session) => {
  const user = session.user;
  if (!canManagePayments(user.role)) return forbidden();

  const scopeFilter = buildScopeFilter(user);
  if (!scopeFilter) return forbidden();

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "transfer";
  if (!isCollectionView(view)) return badRequest("Vista inválida");

  const window = collectionWindow();
  const today = todayYmd();
  const dateParam = url.searchParams.get("date");
  if (dateParam && !isYmd(dateParam)) return badRequest("Fecha inválida");
  // En Transfer, una fecha que ya salió de la ventana (p. ej. la pestaña quedó
  // abierta desde ayer) vuelve al primer día; la respuesta indica la fecha usada.
  const date =
    view === "transfer"
      ? dateParam && window.includes(dateParam)
        ? dateParam
        : window[0]
      : (dateParam ?? today);
  if (view === "approved" && date > today)
    return badRequest("La fecha de pago no puede ser futura");

  const where = viewFilter(view, date, window);
  if (!where) return badRequest("Fecha inválida");

  const search = url.searchParams.get("search")?.trim() || undefined;
  const companyId = Number(url.searchParams.get("companyId")) || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    LIMIT_MAX,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? String(LIMIT_DEFAULT)) || LIMIT_DEFAULT),
  );

  const agentId = Number(url.searchParams.get("agentId")) || undefined;

  // Filtros combinados con AND sobre el alcance del usuario.
  const leadFilter: Prisma.LeadWhereInput = {
    AND: [
      scopeFilter,
      ...(companyId ? [{ companyId }] : []),
      ...(agentId ? [{ assignedToId: agentId }] : []),
      ...(search ? [await buildLeadSearchFilter(search, { matchId: true })] : []),
    ],
  };
  // Transfer (lo que se cobra) solo con productos activos; Aprobados, Proceso y
  // Caída también con productos suspendidos, para ver sus pagos caídos y anular
  // sus débitos en curso.
  const activeBase = collectableProductFilter(leadFilter);
  const anyBase = collectableProductFilter(leadFilter, { activeOnly: false });
  const base = view === "transfer" ? activeBase : anyBase;

  const [rows, total, transferDates, byStatus, approvedToday] = await Promise.all([
    prisma.installment.findMany({
      where: { ...base, ...where },
      orderBy: VIEW_ORDER[view],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        number: true,
        date: true,
        amount: true,
        status: true,
        paidAt: true,
        confirmedAt: true,
        confirmedBy: { select: { name: true } },
        suspendedAt: true,
        suspendReason: true,
        attempts: {
          orderBy: { id: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            rawStatus: true,
            failureCode: true,
            failureReason: true,
            scheduledFor: true,
            createdAt: true,
          },
        },
        paymentPlan: {
          select: {
            product: {
              select: {
                id: true,
                catalog: { select: { name: true, color: true } },
                paymentMethod: {
                  select: {
                    type: true,
                    lastFour: true,
                    bank: true,
                    accountNumber: true,
                    accountBank: true,
                  },
                },
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
    }),
    prisma.installment.count({ where: { ...base, ...where } }),
    // Confirmadas sin enviar hasta el fin de la ventana (incluidas las
    // atrasadas), agrupadas por fecha exacta; abajo se asignan a su día.
    prisma.installment.groupBy({
      by: ["date"],
      where: {
        ...activeBase,
        status: "PENDING",
        confirmedAt: { not: null },
        date: { lt: collectionWindowEnd(window) },
      },
      _count: { _all: true },
    }),
    prisma.installment.groupBy({
      by: ["status"],
      where: { ...anyBase, status: { in: ["PROCESSING", "SUSPENDED", "FAILED"] } },
      _count: { _all: true },
    }),
    prisma.installment.count({ where: { ...anyBase, ...viewFilter("approved", today) } }),
  ]);

  const dayCounts = Object.fromEntries(window.map((d) => [d, 0]));
  for (const row of transferDates) {
    const day = windowDayFor(window, ymdOf(row.date));
    if (day) dayCounts[day] += row._count._all;
  }

  const statusCount = (status: string) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const counts: Record<CollectionView, number> = {
    transfer: Object.values(dayCounts).reduce((a, b) => a + b, 0),
    approved: approvedToday,
    processing: statusCount("PROCESSING"),
    fallen: statusCount("SUSPENDED") + statusCount("FAILED"),
  };

  const data = rows.map(({ paymentPlan, attempts, ...inst }) => {
    const { product } = paymentPlan;
    const method = product.paymentMethod;
    const lastAttempt = attempts[0] ?? null;
    return {
      ...inst,
      amount: Number(inst.amount),
      lastAttempt: lastAttempt && {
        ...lastAttempt,
        voidable: isVoidableAttempt(lastAttempt),
        unconfirmed: isUnconfirmedAttempt(lastAttempt),
        memo: chargeMemo(inst.id, lastAttempt.id),
      },
      product: { id: product.id, name: product.catalog.name, color: product.catalog.color },
      lead: product.lead,
      // Solo los últimos 4 dígitos; las cuentas guardadas antes de que se
      // registrara lastFour se descifran como respaldo.
      paymentMethod: method
        ? {
            type: method.type,
            last4:
              method.lastFour ??
              (method.type === "CUENTA" ? (decrypt(method.accountNumber)?.slice(-4) ?? null) : null),
            bank: method.type === "CUENTA" ? method.accountBank : method.bank,
          }
        : null,
    };
  });

  return NextResponse.json({
    data,
    total,
    totalPages: Math.ceil(total / limit),
    date: view === "transfer" || view === "approved" ? date : null,
    window: window.map((d) => ({ date: d, count: dayCounts[d] })),
    counts,
  });
});
