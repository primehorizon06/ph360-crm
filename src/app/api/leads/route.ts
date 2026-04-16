import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const user = session.user;
  const role = user.role;

  let where = {};

  switch (role) {
    case "ADMIN":
      where = {};
      break;
    case "SUPERVISOR":
      where = { companyId: user.companyId };
      break;
    case "COACH":
      where = { assignedTo: { teamId: user.teamId } };
      break;
    case "AGENT":
      where = { assignedToId: Number(user.id) };
      break;
    default:
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
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
      companyId: true,
      teamId: true,
      assignedToId: true,
      createdAt: true,
      assignedTo: {
        select: { id: true, name: true, team: { select: { name: true } } },
      },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

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

  if (!firstName || !phone1 || !user.companyId || !user.id) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes" },
      { status: 400 },
    );
  }

  // Validar duplicados globales
  const existingPhone = await prisma.lead.findUnique({ where: { phone1 } });
  if (existingPhone)
    return NextResponse.json(
      { error: "El teléfono ya está registrado" },
      { status: 409 },
    );

  if (ssn) {
    const existingSsn = await prisma.lead.findUnique({ where: { ssn } });
    if (existingSsn)
      return NextResponse.json(
        { error: "La seguridad social ya está registrada" },
        { status: 409 },
      );
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
}
