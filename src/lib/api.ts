import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";

export const unauthorized = () =>
  NextResponse.json({ error: "No autorizado" }, { status: 401 });

export const forbidden = (msg = "Sin permisos") =>
  NextResponse.json({ error: msg }, { status: 403 });

export const badRequest = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 });

export const notFound = (msg = "No encontrado") =>
  NextResponse.json({ error: msg }, { status: 404 });

export const conflict = (msg: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: msg, ...extra }, { status: 409 });

export const serverError = (msg = "Error interno del servidor") =>
  NextResponse.json({ error: msg }, { status: 500 });

export async function getAuthSession() {
  return getServerSession(authOptions);
}

function handleRouteError(error: unknown): NextResponse {
  console.error(error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const fields = (error.meta?.target as string[] | undefined)?.join(", ");
        return conflict(
          fields ? `Ya existe un registro con ese valor en: ${fields}` : "El registro ya existe",
        );
      }
      case "P2003":
        return badRequest("Uno de los datos relacionados no existe o no es válido");
      case "P2011": {
        const field = error.meta?.target as string | undefined;
        return badRequest(field ? `Falta el campo requerido: ${field}` : "Falta un campo requerido");
      }
      case "P2025":
        return notFound();
      default:
        return serverError();
    }
  }

  return serverError();
}

export function withAuth(
  handler: (req: NextRequest, session: Session) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await getAuthSession();
      if (!session) return unauthorized();
      return await handler(req, session);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export function withAuthParams<P extends Record<string, string>>(
  handler: (req: NextRequest, session: Session, params: P) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    { params }: { params: Promise<P> }
  ): Promise<NextResponse> => {
    try {
      const session = await getAuthSession();
      if (!session) return unauthorized();
      const resolvedParams = await params;
      return await handler(req, session, resolvedParams);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}
