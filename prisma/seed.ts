import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ─── EMPRESA ──────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Prime Horizon 360 Inc" },
  });

  // ─── EQUIPO ───────────────────────────────────────────────────────────────
  await prisma.team.upsert({
    where: { id: 1 },
    update: { name: "Equipo Alfa" },
    create: { name: "Equipo Alfa", companyId: company.id },
  });

  // ─── USERS ────────────────────────────────────────────────────────────────
  // ADMIN no pertenece a ninguna franquicia ni equipo.
  await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: { companyId: null, teamId: null },
    create: {
      username: "admin",
      name: "Administrador",
      email: "admin@crm.com",
      password: "$2a$12$E09WuJa0HxohXduerw0qeerKqOodekgADtHyoNAJdpaNna1BI92BG",
      role: Role.ADMIN,
    },
  });

  console.log("✅ Seed completo con data realista");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
