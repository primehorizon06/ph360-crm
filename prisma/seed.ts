import {
  PrismaClient,
  Role,
  PermissionScope,
  LeadStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ─── EMPRESA ──────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Prime Horizon 360 Inc" },
  });

  // ─── TEAMS ────────────────────────────────────────────────────────────────
  const teamA = await prisma.team.create({
    data: { name: "Team Alpha", companyId: company.id },
  });

  const teamB = await prisma.team.create({
    data: { name: "Team Beta", companyId: company.id },
  });

  // ─── USERS ────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {},
    create: {
      username: "admin",
      name: "Administrador",
      email: "admin@crm.com",
      password: "hashedpassword",
      role: Role.ADMIN,
      companyId: company.id,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      username: "supervisor",
      name: "Supervisor 1",
      email: "supervisor@crm.com",
      password: "hashedpassword",
      role: Role.SUPERVISOR,
      companyId: company.id,
    },
  });

  const coachA = await prisma.user.create({
    data: {
      username: "coachA",
      name: "Coach Alpha",
      email: "coachA@crm.com",
      password: "hashedpassword",
      role: Role.COACH,
      companyId: company.id,
      teamId: teamA.id,
    },
  });

  const agentA1 = await prisma.user.create({
    data: {
      username: "agentA1",
      name: "Agent A1",
      email: "agentA1@crm.com",
      password: "hashedpassword",
      role: Role.AGENT,
      companyId: company.id,
      teamId: teamA.id,
    },
  });

  const agentB1 = await prisma.user.create({
    data: {
      username: "agentB1",
      name: "Agent B1",
      email: "agentB1@crm.com",
      password: "hashedpassword",
      role: Role.AGENT,
      companyId: company.id,
      teamId: teamB.id,
    },
  });

  // ─── LEADS ────────────────────────────────────────────────────────────────
  const leads = [];

  for (let i = 1; i <= 10; i++) {
    const lead = await prisma.lead.create({
      data: {
        firstName: `Lead${i}`,
        lastName: "Test",
        phone1: `300000000${i}`,
        email: `lead${i}@mail.com`,
        status: Object.values(LeadStatus)[i % 5],
        companyId: company.id,
        teamId: i % 2 === 0 ? teamA.id : teamB.id,
        assignedToId: i % 2 === 0 ? agentA1.id : agentB1.id,
      },
    });

    leads.push(lead);
  }

  // ─── NOTES ────────────────────────────────────────────────────────────────
  for (const lead of leads) {
    await prisma.note.create({
      data: {
        leadId: lead.id,
        authorId: supervisor.id,
        content: `Seguimiento inicial para ${lead.firstName}`,
      },
    });
  }

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────
  for (const lead of leads.slice(0, 5)) {
    await prisma.document.create({
      data: {
        leadId: lead.id,
        name: "ID Document",
        url: "https://example.com/doc.pdf",
        mimeType: "application/pdf",
        size: 123456,
      },
    });
  }

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
