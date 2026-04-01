import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req });
  const path = req.nextUrl.pathname;

  // Rutas públicas
  const publicPaths = ["/auth/login", "/auth/error"];
  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  // Verificar autenticación
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Verificar permisos por rol para rutas específicas
  const role = token.role;

  // Rutas de admin
  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Rutas de supervisor
  if (
    path.startsWith("/supervisor") &&
    !["ADMIN", "SUPERVISOR"].includes(role as string)
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/supervisor/:path*",
    "/leads/:path*",
    "/users/:path*",
  ],
};
