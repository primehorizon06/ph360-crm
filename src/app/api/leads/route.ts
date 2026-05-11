import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden, badRequest, conflict } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";

export const GET = withAuth(async (req, session) => {
  const user = session.user;
  const role = user.role;
  const type =
    new URL(req.url).searchParams.get("type") === "customer"
      ? "customer"
      : "lead";

  let where: Record<string, unknown> = { type };

  switch (role) {
    case UserRole.ADMIN:
      where = { type };
      break;
    case UserRole.SUPERVISOR:
      where = { type, companyId: user.companyId };
      break;
    case UserRole.COACH:
      where = { type, assignedTo: { teamId: user.teamId } };
      break;
    case UserRole.AGENT:
      where = { type, assignedToId: Number(user.id) };
      break;
    default:
      return forbidden();
  }

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone1: true,
      phone2: true,
      email: true,
      city: true,
      state: true,
      status: true,
      customerStatus: true,
      companyId: true,
      teamId: true,
      assignedToId: true,
      createdAt: true,
      assignedTo: {
        select: { id: true, name: true, team: { select: { name: true } } },
      },
      company: { select: { name: true } },
      convertedAt: true,
      products: {
        select: { id: true, product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
});

export const POST = withAuth(async (req, session) => {
  const user = session.user;
  const body = await req.json();
  const {
    firstName,
    lastName,
    phone1,
    phone2,
    ssn,
    address,
    city,
    state,
    zipCode,
    email,
    birthDate,
    contactTime,
  } = body;

  if (!firstName || !phone1 || !user.companyId || !user.id)
    return badRequest("Campos requeridos faltantes");

  const existingPhone = await prisma.lead.findUnique({ where: { phone1 } });
  if (existingPhone) return conflict("El teléfono ya está registrado");

  if (ssn) {
    const existingSsn = await prisma.lead.findUnique({ where: { ssn } });
    if (existingSsn) return conflict("La Seguro social ya está registrada");
  }

  const lead = await prisma.lead.create({
    data: {
      firstName,
      lastName: lastName || null,
      phone1,
      phone2: phone2 || null,
      ssn: ssn || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zipCode: zipCode || null,
      email: email || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      contactTime: contactTime || null,
      companyId: Number(user.companyId),
      teamId: Number(user.teamId),
      assignedToId: Number(user.id),
    },
  });

  return NextResponse.json(lead, { status: 201 });
});
