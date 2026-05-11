import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getDashboardData } from "@/lib/getDashboardData";

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const year = parseInt(
    searchParams.get("year") ?? String(new Date().getFullYear()),
  );
  const month = parseInt(
    searchParams.get("month") ?? String(new Date().getMonth() + 1),
  );
  const quincena = parseInt(searchParams.get("quincena") ?? "1") as 1 | 2;
  const companyId = searchParams.get("companyId") ?? "all";

  const user = session.user as unknown as {
    id: string;
    role: string;
    companyId?: number;
    teamId?: number;
  };

  const data = await getDashboardData(user, {
    year,
    month,
    quincena,
    companyId,
  });
  return NextResponse.json(data);
});
