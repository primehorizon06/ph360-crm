import { Role } from "@prisma/client";

export const UserRole = Role;
export type UserRole = Role;

export const roles = Object.values(Role);