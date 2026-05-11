import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export const unauthorized = () =>
  NextResponse.json({ error: "No autorizado" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Sin permisos" }, { status: 403 });

export const badRequest = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 });

export const notFound = (msg = "No encontrado") =>
  NextResponse.json({ error: msg }, { status: 404 });

export const conflict = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 409 });

export const serverError = (msg = "Error interno del servidor") =>
  NextResponse.json({ error: msg }, { status: 500 });

export async function getAuthSession() {
  return getServerSession(authOptions);
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
      console.error(error);
      return serverError();
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
      console.error(error);
      return serverError();
    }
  };
}
