import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    name: string;
    email?: string | null;
    role: Role;
    companyId?: number | null;
    companyName?: string | null;
    teamId?: number | null;
    teamName?: string | null;
    avatar?: string | null;
  }

  interface Session {
    user: User & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    name: string;
    role: Role;
    companyId?: number | null;
    companyName?: string | null;
    teamId?: number | null;
    teamName?: string | null;
  }
}
