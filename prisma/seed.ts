import { PrismaClient, Role, PermissionScope } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ─── PERMISOS ─────────────────────────────────────────────────────────────
  const permissions = [
    // ADMIN
    {
      role: Role.ADMIN,
      module: "leads",
      canCreate: true,
      canRead: PermissionScope.ALL,
      canUpdate: PermissionScope.ALL,
      canDelete: true,
    },
    {
      role: Role.ADMIN,
      module: "users",
      canCreate: true,
      canRead: PermissionScope.ALL,
      canUpdate: PermissionScope.ALL,
      canDelete: true,
    },
    {
      role: Role.ADMIN,
      module: "companies",
      canCreate: true,
      canRead: PermissionScope.ALL,
      canUpdate: PermissionScope.ALL,
      canDelete: true,
    },
    {
      role: Role.ADMIN,
      module: "teams",
      canCreate: true,
      canRead: PermissionScope.ALL,
      canUpdate: PermissionScope.ALL,
      canDelete: true,
    },

    // SUPERVISOR
    {
      role: Role.SUPERVISOR,
      module: "leads",
      canCreate: true,
      canRead: PermissionScope.COMPANY,
      canUpdate: PermissionScope.COMPANY,
      canDelete: true,
    },
    {
      role: Role.SUPERVISOR,
      module: "users",
      canCreate: true,
      canRead: PermissionScope.COMPANY,
      canUpdate: PermissionScope.COMPANY,
      canDelete: false,
    },
    {
      role: Role.SUPERVISOR,
      module: "companies",
      canCreate: false,
      canRead: PermissionScope.COMPANY,
      canUpdate: PermissionScope.NONE,
      canDelete: false,
    },
    {
      role: Role.SUPERVISOR,
      module: "teams",
      canCreate: true,
      canRead: PermissionScope.COMPANY,
      canUpdate: PermissionScope.COMPANY,
      canDelete: true,
    },

    // COACH
    {
      role: Role.COACH,
      module: "leads",
      canCreate: true,
      canRead: PermissionScope.TEAM,
      canUpdate: PermissionScope.TEAM,
      canDelete: false,
    },
    {
      role: Role.COACH,
      module: "users",
      canCreate: false,
      canRead: PermissionScope.TEAM,
      canUpdate: PermissionScope.NONE,
      canDelete: false,
    },
    {
      role: Role.COACH,
      module: "companies",
      canCreate: false,
      canRead: PermissionScope.NONE,
      canUpdate: PermissionScope.NONE,
      canDelete: false,
    },
    {
      role: Role.COACH,
      module: "teams",
      canCreate: false,
      canRead: PermissionScope.TEAM,
      canUpdate: PermissionScope.NONE,
      canDelete: false,
    },

    // AGENT
    {
      role: Role.AGENT,
      module: "leads",
      canCreate: true,
      canRead: PermissionScope.OWN,
      canUpdate: PermissionScope.OWN,
      canDelete: false,
    },
    {
      role: Role.AGENT,
      module: "users",
      canCreate: false,
      canRead: PermissionScope.NONE,
      canUpdate: PermissionScope.NONE,
      canDelete: false,
    },
    {
      role: Role.AGENT,
      module: "companies",
      canCreate: false,
      canRead: PermissionScope.NONE,
      canUpdate: PermissionScope.NONE,
      canDelete: false,
    },
    {
      role: Role.AGENT,
      module: "teams",
      canCreate: false,
      canRead: PermissionScope.NONE,
      canUpdate: PermissionScope.NONE,
      canDelete: false,
    },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        role_module: { role: permission.role, module: permission.module },
      },
      update: permission,
      create: permission,
    });
  }

  // ─── EMPRESA Y USUARIO ADMIN INICIAL ──────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Prime Horizon 360 Inc" },
  });

  await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {},
    create: {
      username: "admin",
      name: "Administrador",
      email: "admin@crm.com",
      password: "$2a$12$E09WuJa0HxohXduerw0qeerKqOodekgADtHyoNAJdpaNna1BI92BG", 
      role: Role.ADMIN,
      companyId: company.id,
    },
  });

  console.log("✅ Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
