import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { PermissionScope } from "@prisma/client";
import { UserRole } from "@/utils/constants/roles";

interface Permission {
  canCreate: boolean;
  canRead: PermissionScope;
  canUpdate: PermissionScope;
  canDelete: boolean;
}

export function usePermissions() {
  const { data: session, status } = useSession();

  const checkAccessLevel = useCallback(
    (
      level: PermissionScope,
      resourceCompanyId?: number,
      resourceTeamId?: number,
      resourceOwnerId?: number,
    ): boolean => {
      if (!session?.user) return false;

      const user = session.user;

      switch (level) {
        case PermissionScope.ALL:
          return true;
        case PermissionScope.COMPANY:
          return user.companyId === resourceCompanyId;
        case PermissionScope.TEAM:
          return user.teamId === resourceTeamId;
        case PermissionScope.OWN:
          return user.id === resourceOwnerId?.toString();
        case PermissionScope.NONE:
          return false;
        default:
          return false;
      }
    },
    [session],
  );

  const hasPermission = useCallback(
    async (
      moduleName: string,
      action: "create" | "read" | "update" | "delete",
      context?: {
        companyId?: number;
        teamId?: number;
        ownerId?: number;
      },
    ): Promise<boolean> => {
      if (!session?.user || status !== "authenticated") return false;

      try {
        const response = await fetch(
          `/api/permissions?role=${session.user.role}&module=${moduleName}`,
        );
        if (!response.ok) return false;

        const permission: Permission = await response.json();

        switch (action) {
          case "create":
            return permission.canCreate;
          case "read":
            return checkAccessLevel(
              permission.canRead,
              context?.companyId,
              context?.teamId,
              context?.ownerId,
            );
          case "update":
            return checkAccessLevel(
              permission.canUpdate,
              context?.companyId,
              context?.teamId,
              context?.ownerId,
            );
          case "delete":
            return permission.canDelete;
          default:
            return false;
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
        return false;
      }
    },
    [session, status, checkAccessLevel],
  );

  const canViewLead = useCallback(
    (lead: { companyId: number; teamId: number; assignedToId: number }) => {
      if (!session?.user) return false;

      const user = session.user;

      switch (user.role) {
        case UserRole.ADMIN:
          return true;
        case UserRole.SUPERVISOR:
          return user.companyId === lead.companyId;
        case UserRole.COACH:
          return user.teamId === lead.teamId;
        case UserRole.AGENT:
          return user.id === lead.assignedToId.toString();
        default:
          return false;
      }
    },
    [session],
  );

  return {
    hasPermission,
    canViewLead,
    user: session?.user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  };
}
