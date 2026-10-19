"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PaymentCards } from "@/components/dashboard/PaymentCards";
import { PaymentsSummary, PaymentGroup } from "@/components/dashboard/paymentGroups";

interface Props {
  year: number;
  month: number;
  quincena: 1 | 2;
  /** Franquicia elegida en el dashboard; se pasa también al detalle. */
  companyId?: string;
}

/**
 * Cards de pagos de la quincena en el dashboard (admin y Customer Service
 * Holding). Cada card abre la pantalla de detalle (/payments) con su tabla y
 * filtros.
 */
export function PaymentsOverview({ year, month, quincena, companyId }: Props) {
  const period =
    `year=${year}&month=${month}&quincena=${quincena}` + (companyId ? `&companyId=${companyId}` : "");
  const { data } = useSWR<{ summary: PaymentsSummary }>(
    `/api/dashboard/payments?${period}&rows=0`,
    fetcher,
    { keepPreviousData: true },
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-on-surface">Pagos de la quincena</h2>
        <p className="text-sm text-on-surface-variant">Haz clic en un card para ver el detalle</p>
      </div>
      <PaymentCards
        summary={data?.summary}
        hrefFor={(group: PaymentGroup) => `/payments?group=${group}&${period}`}
      />
    </section>
  );
}
