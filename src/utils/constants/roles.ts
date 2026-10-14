import { Role } from "@prisma/client";

export const UserRole = Role;
export type UserRole = Role;

export const roles = Object.values(Role);

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  COACH: "Coach",
  AGENT: "Agente",
  CUSTOMER_SERVICE: "Customer Service",
  CUSTOMER_SERVICE_HOLDING: "Customer Service Holding",
};

// Tokens --color-role-* definidos en globals.css
export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-role-admin/20 text-role-admin",
  SUPERVISOR: "bg-role-supervisor/20 text-role-supervisor",
  COACH: "bg-role-coach/20 text-role-coach",
  AGENT: "bg-role-agent/20 text-role-agent",
  CUSTOMER_SERVICE: "bg-role-customer-service/20 text-role-customer-service",
  CUSTOMER_SERVICE_HOLDING:
    "bg-role-customer-service-holding/20 text-role-customer-service-holding",
};

export function roleLabel(role: string | null | undefined): string {
  return role ? (ROLE_LABELS[role as Role] ?? role) : "";
}
