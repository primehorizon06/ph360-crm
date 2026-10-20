import { env } from "@/env";
import { startOfDay } from "@/lib/businessDays";

// Cliente del Dashboard API de SOAR (ACH).
//
// Endpoints y nombres de campo según la documentación del Dashboard API
// (developers.soarpaydashboard.com, sección ACH). Falta confirmarlos con una
// llamada real al sandbox (ver docs/soar-integration.md).
//
// Sin SOAR_API_TOKEN, fuera de producción se usa un cliente simulado para
// poder desarrollar y probar el flujo completo. En producción, sin token, no
// hay cliente y los cobros responden "no configurado".

export interface SoarAccountInput {
  holderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "Checking" | "Savings";
}

export interface SoarDebit {
  id: string;
  /** Pending, Submitted, Held, Transmitted, Settled, Returned o Voided. */
  status: string;
  returnCode: string | null;
}

export interface SoarAddressInput {
  address1: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface SoarClient {
  createCustomer(input: {
    identifier: string;
    firstName: string;
    lastName: string;
    address: SoarAddressInput;
    account: SoarAccountInput;
  }): Promise<{ customerId: string; accountId: string }>;
  addAccount(customerId: string, account: SoarAccountInput): Promise<{ accountId: string }>;
  createDebit(input: {
    customerId: string;
    accountId: string;
    amount: number;
    memo: string;
    /** Día hábil (YYYY-MM-DD) en que SOAR debe procesarlo; puede ser futuro. */
    effectiveDate: string;
  }): Promise<{ id: string }>;
  getDebit(id: string): Promise<SoarDebit>;
  voidDebit(id: string): Promise<void>;
}

export class SoarError extends Error {
  /**
   * `ambiguous`: no se sabe si SOAR procesó la petición (timeout, error de red,
   * 5xx o respuesta ilegible). Al crear un débito, en ese caso no hay que
   * asumir que falló: podría existir.
   */
  constructor(
    message: string,
    readonly status?: number,
    readonly ambiguous = false,
  ) {
    super(message);
    this.name = "SoarError";
  }
}

// ─── Cliente real ─────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 15_000;

// Objeto Account (POST /ach/customer/{id}/account).
function toAccount(account: SoarAccountInput) {
  return {
    name: account.holderName,
    type: account.accountType,
    routingNumber: account.routingNumber,
    accountNumber: account.accountNumber,
  };
}

// Al crear el cliente, su primera cuenta va en campos planos del Customer.
function toCustomerAccount(account: SoarAccountInput) {
  return {
    accountName: account.holderName,
    accountType: account.accountType,
    routingNumber: account.routingNumber,
    accountNumber: account.accountNumber,
  };
}

function fromDebit(raw: Record<string, unknown>): SoarDebit {
  const ret = raw.return as { code?: string } | null | undefined;
  return {
    id: String(raw.id),
    status: (raw.transactionStatus as string | undefined) ?? "Unknown",
    returnCode: ret?.code ?? null,
  };
}

function createLiveClient(baseUrl: string, token: string, dbaIdEnv: string): SoarClient {
  const dba = { id: Number(dbaIdEnv) };

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (err) {
      // La petición pudo llegar a SOAR antes del corte.
      throw new SoarError(
        err instanceof Error && err.name === "TimeoutError"
          ? "SOAR no respondió a tiempo"
          : "No se pudo conectar con SOAR",
        undefined,
        true,
      );
    }

    const text = await res.text().catch(() => "");
    let json: Record<string, unknown> | null = null;
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      // Respuesta que no es JSON (p. ej. una página de error de un proxy).
    }

    if (!res.ok) {
      if (!json) {
        const challenged = res.headers.get("cf-mitigated") === "challenge";
        console.error(
          `SOAR ${method} ${path}: HTTP ${res.status}`,
          challenged ? "bloqueada por el desafío de Cloudflare" : "respuesta que no es de la API",
          { cfRay: res.headers.get("cf-ray"), contentType: res.headers.get("content-type") },
        );
        throw new SoarError(
          "No se pudo conectar con el procesador de pagos. Intenta de nuevo más tarde.",
          res.status,
          !challenged && res.status >= 500,
        );
      }
      const message = (json.message ?? json.error ?? `Error ${res.status}`) as string;
      // Un 5xx no garantiza que SOAR no haya procesado la petición.
      throw new SoarError(`SOAR: ${message}`, res.status, res.status >= 500);
    }
    if (!json) throw new SoarError("SOAR devolvió una respuesta inválida", res.status, true);
    return json as T;
  }

  return {
    async createCustomer({ identifier, firstName, lastName, address, account }) {
      const res = await request<{ id: string; accounts?: { id: string }[] }>(
        "POST",
        "/ach/customer",
        { dba, identifier, firstName, lastName, ...address, ...toCustomerAccount(account) },
      );
      const accountId = res.accounts?.[0]?.id;
      if (!res.id || !accountId) throw new SoarError("SOAR no devolvió el cliente o la cuenta");
      return { customerId: String(res.id), accountId: String(accountId) };
    },

    async addAccount(customerId, account) {
      const res = await request<{ id: string }>(
        "POST",
        `/ach/customer/${encodeURIComponent(customerId)}/account`,
        toAccount(account),
      );
      if (!res.id) throw new SoarError("SOAR no devolvió la cuenta");
      return { accountId: String(res.id) };
    },

    async createDebit({ customerId, accountId, amount, memo, effectiveDate }) {
      // El código SEC (TEL) no se envía: viene configurado en el DBA.
      const res = await request<{ id: string }>("POST", "/ach", {
        dba,
        transactionType: "Debit",
        amount,
        memo,
        transactionDate: effectiveDate,
        customer: { id: customerId },
        account: { id: accountId },
      });
      if (!res.id) throw new SoarError("SOAR no devolvió el id del débito");
      return { id: String(res.id) };
    },

    async getDebit(id) {
      return fromDebit(await request("GET", `/ach/${encodeURIComponent(id)}`));
    },

    // La acción void solo aplica a débitos ya enviados a procesar; uno que
    // todavía no se envía se elimina en su lugar.
    async voidDebit(id) {
      const path = `/ach/${encodeURIComponent(id)}`;
      try {
        await request("POST", `${path}/void`);
      } catch (err) {
        if (!(err instanceof SoarError) || err.ambiguous || err.status === undefined) throw err;
        await request("DELETE", path);
      }
    },
  };
}

// ─── Cliente simulado (solo desarrollo) ───────────────────────────────────────
//
// Sin estado: el id del débito lleva hasta cuándo sigue pendiente y los
// centavos del monto, y de ahí se deduce el estado al consultarlo.
//   - Pending hasta un minuto después de su fecha de proceso (o de crearlo).
//   - Después: Settled, salvo que el monto termine en .13 (Returned R01,
//     fondos insuficientes) o en .10 (Returned R10, no autorizado).

const MOCK_PENDING_MS = 60_000;

function createMockClient(): SoarClient {
  const rand = () => Math.random().toString(36).slice(2, 10);

  return {
    async createCustomer({ identifier }) {
      return { customerId: `mock_cus_${identifier}`, accountId: `mock_acc_${rand()}` };
    },

    async addAccount() {
      return { accountId: `mock_acc_${rand()}` };
    },

    async createDebit({ amount, effectiveDate }) {
      const cents = Math.round(amount * 100) % 100;
      const pendingUntil =
        Math.max(Date.now(), startOfDay(effectiveDate).getTime()) + MOCK_PENDING_MS;
      return { id: `mock_ach_${pendingUntil}_${cents}_${rand()}` };
    },

    async getDebit(id) {
      const [, , pendingUntil, cents] = id.split("_");
      const pending = Date.now() < Number(pendingUntil);
      const returnCode = cents === "13" ? "R01" : cents === "10" ? "R10" : null;
      if (pending) return { id, status: "Pending", returnCode: null };
      if (returnCode) return { id, status: "Returned", returnCode };
      return { id, status: "Settled", returnCode: null };
    },

    async voidDebit() {},
  };
}

// La configuración solo cambia al reiniciar, así que el cliente se crea una vez.
let client: SoarClient | null | undefined;

export function getSoarClient(): SoarClient | null {
  if (client === undefined) {
    client =
      env.SOAR_API_TOKEN && env.SOAR_API_URL && env.SOAR_ACH_DBA_ID
        ? createLiveClient(env.SOAR_API_URL, env.SOAR_API_TOKEN, env.SOAR_ACH_DBA_ID)
        : env.NODE_ENV !== "production"
          ? createMockClient()
          : null;
  }
  return client;
}
