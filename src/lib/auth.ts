import NextAuth, { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { logAudit, clientIp } from "@/lib/audit";

const MAX_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 20;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;
const INVALID_CREDENTIALS = "Credenciales inválidas";
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

// Bloqueo simple en memoria por usuario. Suficiente para un solo proceso;
// si la app pasa a correr en varias instancias hará falta un store compartido (Redis).
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();

function isExpired(entry: { firstAttemptAt: number }): boolean {
  return Date.now() - entry.firstAttemptAt > WINDOW_MS;
}

function isLockedOut(key: string, limit: number): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (isExpired(entry)) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= limit;
}

function makeRoomForAttempt(): void {
  for (const [key, entry] of loginAttempts) {
    if (isExpired(entry)) loginAttempts.delete(key);
  }
  for (const key of loginAttempts.keys()) {
    if (loginAttempts.size < MAX_TRACKED_KEYS) break;
    loginAttempts.delete(key);
  }
}

function registerFailedAttempt(key: string): void {
  const entry = loginAttempts.get(key);
  if (!entry || isExpired(entry)) {
    loginAttempts.delete(key);
    if (loginAttempts.size >= MAX_TRACKED_KEYS) makeRoomForAttempt();
    loginAttempts.set(key, { count: 1, firstAttemptAt: Date.now() });
    return;
  }
  entry.count += 1;
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        const ip =
          clientIp((name) => req?.headers?.[name] as string | undefined) ?? "unknown";
        const userAgent = (req?.headers?.["user-agent"] as string | undefined) ?? null;

        if (!credentials?.username || !credentials?.password) {
          throw new Error(INVALID_CREDENTIALS);
        }

        const userKey = `user:${credentials.username.toLowerCase()}:${ip}`;
        const ipKey = `ip:${ip}`;
        const registerFailure = () => {
          registerFailedAttempt(userKey);
          registerFailedAttempt(ipKey);
        };

        if (isLockedOut(userKey, MAX_ATTEMPTS) || isLockedOut(ipKey, MAX_IP_ATTEMPTS)) {
          await logAudit({
            action: "LOGIN_LOCKED_OUT",
            entityType: "User",
            metadata: { username: credentials.username },
            ip,
            userAgent,
          });
          throw new Error(
            "Demasiados intentos fallidos. Intenta de nuevo en unos minutos",
          );
        }

        // Buscar usuario por username o email
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: credentials.username },
              { email: credentials.username },
            ],
          },
          include: {
            company: true,
            team: true,
          },
        });

        if (!user || !user.password) {
          await bcrypt.compare(credentials.password, DUMMY_HASH);
          registerFailure();
          await logAudit({
            action: "LOGIN_FAILED",
            entityType: "User",
            metadata: { username: credentials.username, reason: "not_found" },
            ip,
            userAgent,
          });
          throw new Error(INVALID_CREDENTIALS);
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid || !user.active) {
          registerFailure();
          await logAudit({
            action: "LOGIN_FAILED",
            actor: { id: user.id, role: user.role, name: user.name },
            entityType: "User",
            entityId: user.id,
            metadata: { reason: isValid ? "inactive" : "wrong_password" },
            ip,
            userAgent,
          });
          throw new Error(INVALID_CREDENTIALS);
        }

        clearAttempts(userKey);

        await logAudit({
          action: "LOGIN_SUCCESS",
          actor: { id: user.id, role: user.role, name: user.name },
          entityType: "User",
          entityId: user.id,
          ip,
          userAgent,
        });

        return {
          id: user.id.toString(),
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company?.name,
          teamId: user.teamId,
          teamName: user.team?.name,
          avatar: user.avatar,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.teamId = user.teamId;
        token.teamName = user.teamName;
        token.avatar = user.avatar;
        token.sessionVersion = user.sessionVersion ?? 0;
        return token;
      }

      if (!token.id) return token;

      try {
        const current = await prisma.user.findUnique({
          where: { id: Number(token.id) },
          select: { active: true, name: true, role: true, avatar: true, companyId: true, teamId: true, sessionVersion: true },
        });
        if (!current?.active) return {} as JWT;
        if ((token.sessionVersion ?? 0) !== current.sessionVersion) return {} as JWT;

        if (current.companyId !== token.companyId) {
          token.companyName = current.companyId
            ? (await prisma.company.findUnique({ where: { id: current.companyId }, select: { name: true } }))?.name
            : null;
        }
        if (current.teamId !== token.teamId) {
          token.teamName = current.teamId
            ? (await prisma.team.findUnique({ where: { id: current.teamId }, select: { name: true } }))?.name
            : null;
        }

        token.name = current.name;
        token.role = current.role;
        token.avatar = current.avatar;
        token.companyId = current.companyId;
        token.teamId = current.teamId;
        return token;
      } catch (error) {
        console.warn(
          "No se pudo revalidar la sesión; se mantiene el token:",
          error instanceof Error ? error.message : error,
        );
        return token;
      }
    },
    async session({ session, token }) {
      if (!token.id) return {} as Session;
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.name = token.name as string;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId as number;
        session.user.companyName = token.companyName as string;
        session.user.teamId = token.teamId as number;
        session.user.teamName = token.teamName as string;
        session.user.avatar = token.avatar as string;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.id) return;
      try {
        const { count } = await prisma.user.updateMany({
          where: { id: Number(token.id), sessionVersion: token.sessionVersion ?? 0 },
          data: { sessionVersion: { increment: 1 } },
        });
        if (!count) return;
        await logAudit({
          action: "LOGOUT",
          actor: { id: Number(token.id), role: token.role, name: token.name },
          entityType: "User",
          entityId: Number(token.id),
        });
      } catch (error) {
        console.error(
          "No se pudo revocar la sesión al cerrar sesión:",
          error instanceof Error ? error.message : error,
        );
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 1 * 60 * 60,
  },
  jwt: { maxAge: 1 * 60 * 60 },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  secret: env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
