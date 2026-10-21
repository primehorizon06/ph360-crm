import type { InstallmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { UserFacingError } from "@/lib/errors";
import { LEAD_ACCESS_SELECT } from "@/lib/leadService";
import {
  canCharge,
  chargeDateFor,
  COLLECTION_WINDOW_DAYS,
  collectionWindowEnd,
  isCollectableProduct,
  statusFields,
} from "@/lib/collections";
import { startOfDay, todayYmd } from "@/lib/businessDays";
import { getSoarClient, SoarDebit, SoarError } from "@/lib/payments/soar";
import {
  achReturnReason,
  chargeMemo,
  isUnconfirmedAttempt,
  isVoidableAttempt,
  mapSoarStatus,
  UNCONFIRMED_STATUS,
} from "@/lib/payments/status";
import { formatFullName } from "@/utils/helpers/format";

// Error de una regla de cobro; withAuth lo devuelve como 400 con su mensaje.
export class ChargeError extends UserFacingError {
  constructor(message: string) {
    super(message);
    this.name = "ChargeError";
  }
}

function soarClientOrThrow() {
  const client = getSoarClient();
  if (!client) throw new ChargeError("Los cobros por SOAR no están configurados");
  return client;
}

function errorMessage(err: unknown) {
  return err instanceof SoarError || err instanceof ChargeError
    ? err.message
    : "Error inesperado al comunicarse con SOAR";
}

// ─── Cliente y cuenta en SOAR ─────────────────────────────────────────────────

// Espacio de nombres del bloqueo de Postgres que serializa la creación del
// cliente en SOAR por lead (ver ensureSoarAccount).
const SOAR_SYNC_LOCK = 7201;
const SOAR_SYNC_TIMEOUT_MS = 45_000;

function soarCustomerData(lead: {
  lastName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}) {
  const lastName = lead.lastName?.trim() ?? "";
  const address1 = lead.address?.trim() ?? "";
  const city = lead.city?.trim() ?? "";
  const state = lead.state?.trim().toUpperCase() ?? "";
  const zipCode = lead.zipCode?.trim() ?? "";

  const missing = [
    !lastName && "apellido",
    !address1 && "dirección",
    !city && "ciudad",
    !state && "estado",
    !zipCode && "código postal",
  ].filter(Boolean);
  if (missing.length)
    return {
      error: `Faltan datos del cliente para registrarlo en el procesador de pagos: ${missing.join(", ")}`,
    };
  if (!/^[A-Z]{2}$/.test(state))
    return { error: "El estado del cliente debe ser el código de dos letras (por ejemplo, PR o NY)" };

  return { lastName, address: { address1, city, state, zipCode } };
}

/**
 * Garantiza que el lead exista como cliente ACH en SOAR (identifier = id del
 * lead) y que la cuenta bancaria del producto esté registrada. Guarda los ids
 * de SOAR; si falla, deja el error en el método de pago para mostrarlo.
 *
 * Corre con un bloqueo por lead: si la aprobación y un cobro (o dos
 * reintentos) llegan a la vez, el segundo espera y reutiliza lo que creó el
 * primero en vez de crear otro cliente en SOAR.
 */
export async function ensureSoarAccount(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { leadId: true, paymentMethod: { select: { id: true, type: true } } },
  });
  const methodRef = product?.paymentMethod;
  if (!product || !methodRef) throw new ChargeError("El producto no tiene método de pago");
  if (methodRef.type !== "CUENTA")
    throw new ChargeError("El producto no tiene una cuenta bancaria para debitar");

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SOAR_SYNC_LOCK}::int, ${product.leadId}::int)`;

      // Releer con el bloqueo tomado: otro proceso pudo terminar mientras tanto.
      const lead = await tx.lead.findUniqueOrThrow({
        where: { id: product.leadId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          soarCustomerId: true,
        },
      });
      const method = await tx.paymentMethod.findUniqueOrThrow({ where: { id: methodRef.id } });

      if (lead.soarCustomerId && method.soarAccountId)
        return { customerId: lead.soarCustomerId, accountId: method.soarAccountId };

      const routingNumber = decrypt(method.routingNumber);
      const accountNumber = decrypt(method.accountNumber);
      if (!routingNumber || !accountNumber)
        return { error: "Faltan el número de ruta o de cuenta del producto" };

      const leadName = formatFullName(lead);
      const account = {
        holderName: method.accountHolder?.trim() || leadName.trim(),
        routingNumber,
        accountNumber,
        accountType:
          method.accountType === "AHORROS" ? ("Savings" as const) : ("Checking" as const),
      };

      try {
        const client = soarClientOrThrow();
        if (!lead.soarCustomerId) {
          const customer = soarCustomerData(lead);
          if ("error" in customer) return { error: customer.error };
          const { customerId, accountId } = await client.createCustomer({
            identifier: String(lead.id),
            firstName: lead.firstName.trim(),
            lastName: customer.lastName,
            address: customer.address,
            account,
          });
          await tx.lead.update({ where: { id: lead.id }, data: { soarCustomerId: customerId } });
          await tx.paymentMethod.update({
            where: { id: method.id },
            data: { soarAccountId: accountId, soarSyncError: null },
          });
          return { customerId, accountId };
        }

        const { accountId } = await client.addAccount(lead.soarCustomerId, account);
        await tx.paymentMethod.update({
          where: { id: method.id },
          data: { soarAccountId: accountId, soarSyncError: null },
        });
        return { customerId: lead.soarCustomerId, accountId };
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
    { timeout: SOAR_SYNC_TIMEOUT_MS, maxWait: SOAR_SYNC_TIMEOUT_MS },
  );

  // El error se guarda fuera de la transacción para que no se revierta.
  if ("error" in result) {
    await prisma.paymentMethod.update({
      where: { id: methodRef.id },
      data: { soarSyncError: result.error ?? null },
    });
    throw new ChargeError(result.error ?? "Error al sincronizar con SOAR");
  }
  return result;
}

// ─── Cobro ────────────────────────────────────────────────────────────────────

/**
 * Crea el débito ACH (SEC TEL) de una cuota pendiente y confirmada: atrasada, de hoy, o de
 * una fecha hábil futura dentro de la ventana de cobro (queda programado). La
 * cuota pasa a PROCESSING de forma atómica, así dos personas no pueden cobrar
 * la misma cuota a la vez.
 */
export async function chargeInstallment(installmentId: number, chargedById: number) {
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    select: {
      id: true,
      status: true,
      date: true,
      amount: true,
      confirmedAt: true,
      paymentPlan: {
        select: {
          product: {
            select: { id: true, status: true, approval: { select: { status: true } } },
          },
        },
      },
    },
  });
  if (!installment) throw new ChargeError("Cuota no encontrada");

  const { product } = installment.paymentPlan;
  if (!isCollectableProduct(product))
    throw new ChargeError("Solo se cobran cuotas de productos aprobados y activos");
  if (installment.status !== "PENDING")
    throw new ChargeError("Solo se puede cobrar una cuota pendiente");
  if (!canCharge(installment))
    throw new ChargeError("El pago no está confirmado; confírmalo antes de cobrarlo");
  if (installment.date >= collectionWindowEnd())
    throw new ChargeError(
      `Solo se puede cobrar o programar hasta ${COLLECTION_WINDOW_DAYS - 1} días hábiles antes`,
    );

  // Si la cuota vence en un día hábil futuro, el débito queda programado para
  // ese día; si ya venció, se procesa en el próximo día hábil.
  const effectiveDate = chargeDateFor(installment.date);
  const scheduledFor = effectiveDate > todayYmd() ? startOfDay(effectiveDate) : null;

  const { customerId, accountId } = await ensureSoarAccount(product.id);

  const claimed = await prisma.installment.updateMany({
    where: { id: installment.id, status: "PENDING", confirmedAt: { not: null } },
    data: { status: "PROCESSING" },
  });
  if (claimed.count === 0)
    throw new ChargeError("El pago cambió mientras tanto (ya no está pendiente o confirmado)");

  const attempt = await prisma.chargeAttempt.create({
    data: {
      installmentId: installment.id,
      processor: "SOAR_ACH",
      amount: installment.amount,
      status: "PROCESSING",
      chargedById,
      scheduledFor,
    },
  });
  const memo = chargeMemo(installment.id, attempt.id);

  try {
    const debit = await soarClientOrThrow().createDebit({
      customerId,
      accountId,
      amount: Number(installment.amount),
      memo,
      effectiveDate,
    });
    return prisma.chargeAttempt.update({
      where: { id: attempt.id },
      data: { externalId: debit.id, rawStatus: "Pending" },
    });
  } catch (err) {
    const definitive = err instanceof ChargeError || (err instanceof SoarError && !err.ambiguous);

    if (!definitive) {
      // No se sabe si el débito existe: la cuota queda en proceso (no se puede
      // volver a cobrar) hasta que alguien lo verifique en SOAR.
      await prisma.chargeAttempt.update({
        where: { id: attempt.id },
        data: { rawStatus: UNCONFIRMED_STATUS, failureReason: errorMessage(err) },
      });
      throw new ChargeError(
        `SOAR no confirmó el débito (${errorMessage(err)}). La cuota queda en proceso: ` +
          `búscalo en SOAR con el memo ${memo} antes de volver a cobrar.`,
      );
    }

    await prisma.$transaction([
      prisma.chargeAttempt.update({
        where: { id: attempt.id },
        data: { status: "FAILED", failureReason: errorMessage(err) },
      }),
      prisma.installment.update({
        where: { id: installment.id },
        data: { status: "PENDING" },
      }),
    ]);
    throw new ChargeError(errorMessage(err));
  }
}

// ─── Estado ───────────────────────────────────────────────────────────────────

// Desde qué estados de la cuota se acepta cada resultado del procesador. Así
// un evento viejo o repetido no pisa un cambio manual (p. ej. una cuota
// devuelta que ya se reprogramó).
const ALLOWED_FROM: Record<InstallmentStatus, InstallmentStatus[]> = {
  PROCESSING: ["PROCESSING"],
  PAID: ["PROCESSING", "PAID"],
  FAILED: ["PROCESSING", "PAID"], // PAID → FAILED: devolución tardía
  PENDING: ["PROCESSING"], // débito anulado
  SUSPENDED: [],
  CHARGEBACK: ["PAID"],
  CANCELLED: [],
};

/**
 * Aplica el estado que informa SOAR a un intento y, si es el último intento de
 * la cuota y la cuota está en un estado compatible, a la cuota. Lo usan la
 * actualización manual, los webhooks y la conciliación.
 */
export async function applySoarDebit(attemptId: number, debit: SoarDebit) {
  const mapped = mapSoarStatus(debit.status);
  if (!mapped) {
    console.error(`SOAR débito ${debit.id}: estado desconocido "${debit.status}"`);
    return null;
  }

  const attempt = await prisma.chargeAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      installmentId: true,
      settledAt: true,
      installment: {
        select: {
          paidAt: true,
          attempts: { orderBy: { id: "desc" }, take: 1, select: { id: true } },
        },
      },
    },
  });
  if (!attempt) return null;

  const isLatest = attempt.installment.attempts[0]?.id === attempt.id;
  const isReturn = mapped.attempt === "FAILED";
  const now = new Date();

  const [updated] = await prisma.$transaction([
    prisma.chargeAttempt.update({
      where: { id: attempt.id },
      data: {
        status: mapped.attempt,
        rawStatus: debit.status,
        failureCode: isReturn ? debit.returnCode : null,
        failureReason: isReturn
          ? (achReturnReason(debit.returnCode) ??
            debit.errorMessage ??
            "El procesador de pagos rechazó el débito")
          : null,
        settledAt: mapped.attempt === "SUCCEEDED" ? (attempt.settledAt ?? now) : attempt.settledAt,
      },
    }),
    ...(isLatest
      ? [
          prisma.installment.updateMany({
            where: {
              id: attempt.installmentId,
              status: { in: ALLOWED_FROM[mapped.installment] },
            },
            data: {
              ...statusFields(mapped.installment),
              // La fecha de pago es la primera vez que se liquidó.
              paidAt: mapped.installment === "PAID" ? (attempt.installment.paidAt ?? now) : null,
            },
          }),
        ]
      : []),
  ]);
  return updated;
}

async function findSoarAttempt(attemptId: number) {
  const attempt = await prisma.chargeAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.processor !== "SOAR_ACH") throw new ChargeError("Cobro no encontrado");
  return attempt;
}

function unconfirmedMessage(attempt: { id: number; installmentId: number }) {
  return (
    `SOAR no confirmó este débito. Búscalo en SOAR con el memo ` +
    `${chargeMemo(attempt.installmentId, attempt.id)}; si no existe, descártalo.`
  );
}

/** Consulta el débito en SOAR y actualiza el intento y la cuota. */
export async function refreshAttempt(attemptId: number) {
  const attempt = await findSoarAttempt(attemptId);
  if (!attempt.externalId) {
    if (isUnconfirmedAttempt(attempt)) throw new ChargeError(unconfirmedMessage(attempt));
    throw new ChargeError("El cobro no llegó a crearse en SOAR");
  }

  let debit: SoarDebit;
  try {
    debit = await soarClientOrThrow().getDebit(attempt.externalId);
  } catch (err) {
    throw new ChargeError(errorMessage(err));
  }
  const updated = await applySoarDebit(attempt.id, debit);
  if (!updated)
    throw new ChargeError(
      `El procesador de pagos informó un estado que el CRM no reconoce (${debit.status})`,
    );
  return updated;
}

/**
 * Anula un débito que SOAR todavía no transmitió al banco. Un débito sin
 * confirmar (sin id de SOAR) se descarta: quien lo hace ya verificó en SOAR
 * que no existe.
 */
export async function voidAttempt(attemptId: number) {
  const attempt = await findSoarAttempt(attemptId);

  if (!attempt.externalId) {
    if (!isUnconfirmedAttempt(attempt)) throw new ChargeError("Este débito ya no se puede anular");
    const [discarded] = await prisma.$transaction([
      prisma.chargeAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "VOIDED",
          failureReason: "Descartado: se verificó que no se creó en SOAR",
        },
      }),
      prisma.installment.updateMany({
        where: { id: attempt.installmentId, status: "PROCESSING" },
        data: statusFields("PENDING"),
      }),
    ]);
    return discarded;
  }

  if (!isVoidableAttempt(attempt))
    throw new ChargeError("SOAR ya transmitió este débito al banco y no se puede anular");

  try {
    await soarClientOrThrow().voidDebit(attempt.externalId);
  } catch (err) {
    throw new ChargeError(errorMessage(err));
  }

  return applySoarDebit(attempt.id, { id: attempt.externalId, status: "Voided", returnCode: null });
}

/** Contexto de un intento (lead y producto) para validar acceso en las rutas. */
export async function findAttemptContext(attemptId: number) {
  if (!Number.isInteger(attemptId)) return null;
  const attempt = await prisma.chargeAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      installmentId: true,
      installment: {
        select: {
          paymentPlan: {
            select: { productId: true, product: { select: { lead: { select: LEAD_ACCESS_SELECT } } } },
          },
        },
      },
    },
  });
  if (!attempt) return null;
  const { productId, product } = attempt.installment.paymentPlan;
  return { id: attempt.id, installmentId: attempt.installmentId, productId, lead: product.lead };
}
