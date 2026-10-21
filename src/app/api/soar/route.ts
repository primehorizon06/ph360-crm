import { NextResponse } from "next/server";
import { withAuth, badRequest, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { getSoarClient } from "@/lib/payments/soar";

const SAFE_PATH = /^\/[\w\-./?=&%[\]]*$/;

export const GET = withAuth(async (req, session) => {
  if (session.user.role !== UserRole.ADMIN) return forbidden();

  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!SAFE_PATH.test(path) || path.startsWith("//") || path.includes(".."))
    return badRequest("Ruta inválida. Ejemplo: /ach/90793998");

  const client = getSoarClient();
  if (!client) return badRequest("SOAR no está configurado");

  try {
    return NextResponse.json({ path, ...(await client.rawGet(path)) });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "No se pudo consultar SOAR");
  }
});
