import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/getDashboardData";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quincena: 1 | 2 = now.getDate() <= 15 ? 1 : 2;

  const initialData = await getDashboardData(
    {
      id: session.user.id,
      role: session.user.role,
      companyId: session.user.companyId ?? undefined,
      teamId: session.user.teamId ?? undefined,
    },
    { year, month, quincena, companyId: "all" },
  );

  return (
    <DashboardClient
      initialData={initialData}
      user={{
        id: session.user.id,
        name: session.user.name ?? "",
        role: session.user.role,
        companyId: session.user.companyId ?? undefined,
        companyName: session.user.companyName ?? undefined,
        teamId: session.user.teamId ?? undefined,
      }}
    />
  );
}
