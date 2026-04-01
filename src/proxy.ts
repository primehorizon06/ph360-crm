import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req });
  const path = req.nextUrl.pathname;

  // Rutas públicas
  const publicPaths = ["/auth/login", "/auth/error"];
  if (publicPaths.includes(path)) {
    if (token) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Verificar autenticación
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const role = token.role as string;

  // Proteger rutas por rol
  if (path.startsWith("/users") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (path.startsWith("/companies") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (path.startsWith("/teams") && !["ADMIN", "SUPERVISOR"].includes(role)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|api/auth).*)",
  ],
};