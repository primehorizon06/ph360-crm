import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/api";
import { canManagePayments } from "@/lib/permissions";
import { PaymentsReport } from "@/components/dashboard/PaymentsReport";
import { isPaymentGroup } from "@/components/dashboard/paymentGroups";
import { todayYmd } from "@/lib/businessDays";

// Detalle de los pagos de la quincena, al que llevan los cards del dashboard.
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/auth/login");
  if (!canManagePayments(session.user.role)) redirect("/");

  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);

  // Sin período válido, la quincena actual en Colombia (el servidor puede estar en UTC).
  const [todayYear, todayMonth, todayDay] = todayYmd().split("-").map(Number);
  const year = Number(value("year")) || todayYear;
  const monthParam = Number(value("month"));
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam : todayMonth;
  const quincena: 1 | 2 =
    value("quincena") === "1" ? 1 : value("quincena") === "2" ? 2 : todayDay <= 15 ? 1 : 2;
  const group = value("group");
  const companyId = Number(value("companyId")) || undefined;

  return (
    <PaymentsReport
      initialGroup={isPaymentGroup(group) ? group : "transfer"}
      year={year}
      month={month}
      quincena={quincena}
      initialCompanyId={companyId ? String(companyId) : undefined}
    />
  );
}
