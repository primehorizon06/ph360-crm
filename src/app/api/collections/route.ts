import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, badRequest, forbidden } from "@/lib/api";
import { buildScopeFilter, canManagePayments } from "@/lib/permissions";
import { buildLeadSearchFilter } from "@/lib/leadService";
import { decrypt } from "@/lib/crypto";
import { chargeMemo, isUnconfirmedAttempt, isVoidableAttempt } from "@/lib/payments/status";
import {
  CollectionView,
  VIEW_ORDER,
  collectableProductFilter,
  isCollectionView,
  viewFilter,
} from "@/lib/collections";

const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

// Pestañas que se cuentan por estado en un solo groupBy; "today" y "overdue"
// comparten PENDING y se separan por fecha.
const STATUS_VIEWS = { SUSPENDED: "suspended", PROCESSING: "processing", FAILED: "failed" } as const;

// Cola de cobros de Customer Service: cuotas de hoy, atrasadas, suspendidas,
// en proceso y devueltas de productos aprobados, con el conteo de cada pestaña.
export const GET = withAuth(async (req, session) => {
  const user = session.user;
  if (!canManagePayments(user.role)) return forbidden();

  const scopeFilter = buildScopeFilter(user);
  if (!scopeFilter) return forbidden();

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "today";
  if (!isCollectionView(view)) return badRequest("Vista inválida");

  const search = url.searchParams.get("search")?.trim() || undefined;
  const companyId = Number(url.searchParams.get("companyId")) || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    LIMIT_MAX,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? String(LIMIT_DEFAULT)) || LIMIT_DEFAULT),
  );

  const leadFilter: Prisma.LeadWhereInput = {
    ...scopeFilter,
    ...(companyId ? { companyId } : {}),
    ...(search ? await buildLeadSearchFilter(search, { matchId: true }) : {}),
  };
  const base = collectableProductFilter(leadFilter);

  const [rows, byStatus, todayCount, overdueCount] = await Promise.all([
    prisma.installment.findMany({
      where: { ...base, ...viewFilter(view) },
      orderBy: VIEW_ORDER[view],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        number: true,
        date: true,
        amount: true,
        status: true,
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
            createdAt: true,
          },
        },
        paymentPlan: {
          select: {
            _count: { select: { installments: true } },
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
                    phone1: true,
                    company: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.installment.groupBy({
      by: ["status"],
      where: { ...base, status: { in: Object.keys(STATUS_VIEWS) as (keyof typeof STATUS_VIEWS)[] } },
      _count: { _all: true },
    }),
    prisma.installment.count({ where: { ...base, ...viewFilter("today") } }),
    prisma.installment.count({ where: { ...base, ...viewFilter("overdue") } }),
  ]);

  const counts: Record<CollectionView, number> = {
    today: todayCount,
    overdue: overdueCount,
    suspended: 0,
    processing: 0,
    failed: 0,
  };
  for (const row of byStatus)
    counts[STATUS_VIEWS[row.status as keyof typeof STATUS_VIEWS]] = row._count._all;

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
      totalInstallments: paymentPlan._count.installments,
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

  const total = counts[view];
  return NextResponse.json({ data, total, totalPages: Math.ceil(total / limit), counts });
});
