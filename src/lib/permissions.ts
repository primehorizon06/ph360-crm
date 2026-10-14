import type { Prisma } from "@prisma/client";
import { UserRole } from "@/utils/constants/roles";

export interface ScopeUser {
  id: string;
  role: string;
  companyId?: number | null;
  teamId?: number | null;
}

// ── Role guards (pure, usable in server and client) ────────────────────────────

export function canViewProductChecklist(role: string): boolean {
  return (
    role === UserRole.COACH ||
    role === UserRole.SUPERVISOR ||
    role === UserRole.ADMIN
  );
}

export function canSuspendLead(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
}

export function canResubmitProduct(role: string): boolean {
  return role === UserRole.COACH || role === UserRole.ADMIN;
}

// ── Customer Service ───────────────────────────────────────────────────────────
// CUSTOMER_SERVICE (franquicia): ve su franquicia, deja notas, recordatorios y
// adjuntos, pero no edita el lead ni gestiona pagos.
// CUSTOMER_SERVICE_HOLDING: ve todas las franquicias, gestiona productos,
// cuentas y cuotas, edita el teléfono principal y traslada leads entre
// franquicias. Ninguno crea leads ni productos ni aprueba productos.

export function isGlobalCustomerService(role: string): boolean {
  return role === UserRole.CUSTOMER_SERVICE_HOLDING;
}

/** Roles que no pertenecen a una franquicia ni a un equipo (usuario sin companyId/teamId). */
export function isGlobalRole(role: string): boolean {
  return role === UserRole.ADMIN || isGlobalCustomerService(role);
}

export function isCustomerService(role: string): boolean {
  return role === UserRole.CUSTOMER_SERVICE || isGlobalCustomerService(role);
}

/** Roles que pertenecen a una franquicia y a un equipo (el equipo es obligatorio). */
export function roleRequiresTeam(role: string): boolean {
  return role === UserRole.AGENT || role === UserRole.COACH;
}

// Un lead se crea en la franquicia y el equipo de quien lo crea, así que solo
// pueden crearlo los roles que tienen ambos.
export function canCreateLead(role: string): boolean {
  return roleRequiresTeam(role);
}

export function canCreateProduct(role: string): boolean {
  return !isCustomerService(role);
}

export function canEditLead(role: string): boolean {
  return role !== UserRole.CUSTOMER_SERVICE;
}

/** Estado del producto, datos de la cuenta y cuotas de productos aprobados. */
export function canManagePayments(role: string): boolean {
  return role === UserRole.ADMIN || isGlobalCustomerService(role);
}

export function canEditMainPhone(role: string): boolean {
  return role === UserRole.ADMIN || isGlobalCustomerService(role);
}

/** Cambiar la franquicia, el equipo o el asesor de un lead sin restricción de alcance. */
export function canTransferLead(role: string): boolean {
  return role === UserRole.ADMIN || isGlobalCustomerService(role);
}

/**
 * Returns a Prisma WHERE fragment scoping a Lead/Customer list query to what
 * the user is allowed to see. Returns null when the role has no list access.
 */
export function buildScopeFilter(user: ScopeUser): Prisma.LeadWhereInput | null {
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.CUSTOMER_SERVICE_HOLDING:
      return {};
    case UserRole.SUPERVISOR:
    case UserRole.CUSTOMER_SERVICE:
      return { companyId: Number(user.companyId) };
    case UserRole.COACH:
      return { assignedTo: { teamId: Number(user.teamId) } };
    case UserRole.AGENT:
      return { assignedToId: Number(user.id) };
    default:
      return null;
  }
}

/**
 * Checks whether a user can access a specific lead/customer record.
 * ADMIN and global Customer Service: always. SUPERVISOR and franchise Customer
 * Service: same company. COACH: same team. AGENT: own record only.
 */
export function canAccessLead(
  user: ScopeUser,
  resource: { companyId: number; teamId: number; assignedToId: number },
): boolean {
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.CUSTOMER_SERVICE_HOLDING:
      return true;
    case UserRole.SUPERVISOR:
    case UserRole.CUSTOMER_SERVICE:
      return resource.companyId === Number(user.companyId);
    case UserRole.COACH:
      return resource.teamId === Number(user.teamId);
    case UserRole.AGENT:
      return resource.assignedToId === Number(user.id);
    default:
      return false;
  }
}

/**
 * Resolves which companyId to scope a query to.
 * ADMIN may target any company via an explicit param; others are locked to
 * their own companyId (undefined means no company constraint for ADMIN).
 */
export function getScopedCompanyId(
  user: ScopeUser,
  requestedCompanyId?: number,
): number | undefined {
  if (user.role === UserRole.ADMIN || isGlobalCustomerService(user.role))
    return requestedCompanyId;
  return user.companyId ?? undefined;
}