import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { UserRole } from "./utils/constants/roles";

export async function proxy(req: NextRequest) {
  console.log("proxy corriendo:", req.nextUrl.pathname);
  const token = await getToken({ req });
  const path = req.nextUrl.pathname;

  const publicPaths = ["/auth/login", "/auth/error"];
  if (publicPaths.includes(path)) {
    if (token) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?expired=true", req.url));
  }

  const role = token.role as UserRole;

  if (path.startsWith("/users") && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (path.startsWith("/companies") && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (
    path.startsWith("/teams") &&
    ![UserRole.ADMIN, UserRole.SUPERVISOR].includes(role)
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|api/auth).*)"],
};
