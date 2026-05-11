import { Prisma } from "@prisma/client";
import { UserRole } from "@/utils/constants/roles";

export interface ScopeUser {
  id: string;
  role: string;
  companyId?: number | null;
  teamId?: number | null;
}

/**
 * Returns a Prisma WHERE fragment scoping a Lead/Customer list query to what
 * the user is allowed to see. Returns null when the role has no list access.
 */
export function buildScopeFilter(user: ScopeUser): Prisma.LeadWhereInput | null {
  switch (user.role) {
    case UserRole.ADMIN:
      return {};
    case UserRole.SUPERVISOR:
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
 * ADMIN: always. SUPERVISOR/COACH: same company. AGENT: own record only.
 */
export function canAccessLead(
  user: ScopeUser,
  resource: { companyId: number | null; assignedToId: number | null },
): boolean {
  switch (user.role) {
    case UserRole.ADMIN:
      return true;
    case UserRole.SUPERVISOR:
    case UserRole.COACH:
      return resource.companyId === Number(user.companyId);
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
  if (user.role === UserRole.ADMIN) return requestedCompanyId;
  return user.companyId ?? undefined;
}