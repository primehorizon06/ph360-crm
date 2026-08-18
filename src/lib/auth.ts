import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { logAudit } from "@/lib/audit";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Bloqueo simple en memoria por usuario. Suficiente para un solo proceso;
// si la app pasa a correr en varias instancias hará falta un store compartido (Redis).
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();

function isLockedOut(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAttemptAt > WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailedAttempt(key: string): void {
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() - entry.firstAttemptAt > WINDOW_MS) {
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
          (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
          (req?.headers?.["x-real-ip"] as string | undefined) ??
          null;
        const userAgent = (req?.headers?.["user-agent"] as string | undefined) ?? null;

        if (!credentials?.username || !credentials?.password) {
          throw new Error("Credenciales inválidas");
        }

        const attemptKey = credentials.username.toLowerCase();
        if (isLockedOut(attemptKey)) {
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
          registerFailedAttempt(attemptKey);
          await logAudit({
            action: "LOGIN_FAILED",
            entityType: "User",
            metadata: { username: credentials.username, reason: "not_found" },
            ip,
            userAgent,
          });
          throw new Error("Usuario no encontrado");
        }

        if (!user.active) {
          throw new Error("Usuario inactivo");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          registerFailedAttempt(attemptKey);
          await logAudit({
            action: "LOGIN_FAILED",
            actor: { id: user.id, role: user.role, name: user.name },
            entityType: "User",
            entityId: user.id,
            metadata: { reason: "wrong_password" },
            ip,
            userAgent,
          });
          throw new Error("Contraseña incorrecta");
        }

        clearAttempts(attemptKey);

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
      }
      return token;
    },
    async session({ session, token }) {
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
