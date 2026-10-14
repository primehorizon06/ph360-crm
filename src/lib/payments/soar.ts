import { env } from "@/env";

// Cliente del Dashboard API de SOAR (ACH).
//
// Los endpoints salen de la documentación de SOAR; los NOMBRES DE CAMPO de
// cada petición y respuesta están concentrados en las funciones to*/from* de
// este archivo y hay que confirmarlos en el sandbox (fase F0) antes de usar el
// cliente real.
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

export interface SoarClient {
  createCustomer(input: {
    identifier: string;
    name: string;
    account: SoarAccountInput;
  }): Promise<{ customerId: string; accountId: string }>;
  addAccount(customerId: string, account: SoarAccountInput): Promise<{ accountId: string }>;
  createDebit(input: {
    customerId: string;
    accountId: string;
    amount: number;
    memo: string;
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

function toAccount(account: SoarAccountInput) {
  return {
    name: account.holderName,
    routingNumber: account.routingNumber,
    accountNumber: account.accountNumber,
    accountType: account.accountType,
  };
}

function fromDebit(raw: Record<string, unknown>): SoarDebit {
  const status = raw.status as string | { status?: string } | undefined;
  const ret = raw.return as { code?: string } | null | undefined;
  return {
    id: String(raw.id),
    status: (typeof status === "object" ? status?.status : status) ?? "Unknown",
    returnCode: ret?.code ?? null,
  };
}

function createLiveClient(baseUrl: string, token: string, dbaId: string): SoarClient {
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
      const message = (json?.message ?? json?.error ?? `Error ${res.status}`) as string;
      // Un 5xx no garantiza que SOAR no haya procesado la petición.
      throw new SoarError(`SOAR: ${message}`, res.status, res.status >= 500);
    }
    if (!json) throw new SoarError("SOAR devolvió una respuesta inválida", res.status, true);
    return json as T;
  }

  return {
    async createCustomer({ identifier, name, account }) {
      const res = await request<{ id: string; accounts?: { id: string }[] }>(
        "POST",
        "/ach/customer",
        { dba: { id: dbaId }, identifier, name, accounts: [toAccount(account)] },
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

    async createDebit({ customerId, accountId, amount, memo }) {
      const res = await request<{ id: string }>("POST", "/ach", {
        dba: { id: dbaId },
        type: "Debit",
        secCode: "TEL",
        amount,
        memo,
        customer: { id: customerId },
        account: { id: accountId },
      });
      if (!res.id) throw new SoarError("SOAR no devolvió el id del débito");
      return { id: String(res.id) };
    },

    async getDebit(id) {
      return fromDebit(await request("GET", `/ach/${encodeURIComponent(id)}`));
    },

    async voidDebit(id) {
      await request("POST", `/ach/${encodeURIComponent(id)}/void`);
    },
  };
}

// ─── Cliente simulado (solo desarrollo) ───────────────────────────────────────
//
// Sin estado: el id del débito lleva la hora de creación y los centavos del
// monto, y de ahí se deduce el estado al consultarlo.
//   - Primer minuto: Pending.
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

    async createDebit({ amount }) {
      const cents = Math.round(amount * 100) % 100;
      return { id: `mock_ach_${Date.now()}_${cents}_${rand()}` };
    },

    async getDebit(id) {
      const [, , createdAt, cents] = id.split("_");
      const pending = Date.now() - Number(createdAt) < MOCK_PENDING_MS;
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
