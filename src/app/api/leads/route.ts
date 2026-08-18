import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden, badRequest, conflict } from "@/lib/api";
import { buildScopeFilter } from "@/lib/permissions";
import { CustomerStatus, LeadStatus, Prisma } from "@prisma/client";
import { encryptDeterministic } from "@/lib/crypto";
import { leadSchema } from "@/lib/validations/lead";
import { UserRole } from "@/utils/constants/roles";

const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

export const GET = withAuth(async (req, session) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "customer" ? "customer" : "lead";
  const search = url.searchParams.get("search")?.trim() || undefined;
  const statusParam = url.searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    LIMIT_MAX,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? String(LIMIT_DEFAULT)) || LIMIT_DEFAULT),
  );

  const user = session.user;

  const scopeFilter = buildScopeFilter(user);
  if (!scopeFilter) return forbidden();

  let where: Prisma.LeadWhereInput = { type, ...scopeFilter };

  if (statusParam && statusParam !== "ALL") {
    where =
      type === "lead"
        ? { ...where, status: statusParam as LeadStatus }
        : { ...where, customerStatus: statusParam as CustomerStatus };
  }

  if (search) {
    where = {
      ...where,
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone1: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const select: Prisma.LeadSelect = {
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
    products: { select: { id: true, product: true } },
  };

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const POST = withAuth(async (req, session) => {
  const user = session.user;
  const rawBody = await req.json();

  const parsed = leadSchema.safeParse(rawBody);
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

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
  } = parsed.data;

  let companyId: number;
  let teamId: number;
  let assignedToId: number;

  if (user.role === UserRole.ADMIN) {
    companyId = Number(rawBody.companyId);
    teamId = Number(rawBody.teamId);
    assignedToId = Number(rawBody.assignedToId);
    if (!companyId || !teamId || !assignedToId)
      return badRequest("Selecciona franquicia, equipo y agente asignado");
  } else {
    if (!user.companyId || !user.id) return badRequest("Campos requeridos faltantes");
    if (!user.teamId)
      return badRequest("Tu usuario no tiene un equipo asignado. Contacta a un administrador.");
    companyId = Number(user.companyId);
    teamId = Number(user.teamId);
    assignedToId = Number(user.id);
  }

  const existingPhone = await prisma.lead.findUnique({ where: { phone1 } });
  if (existingPhone) return conflict("El teléfono ya está registrado");

  const encryptedSsn = ssn ? encryptDeterministic(ssn) : null;

  if (encryptedSsn) {
    const existingSsn = await prisma.lead.findUnique({ where: { ssn: encryptedSsn } });
    if (existingSsn) return conflict("La Seguro social ya está registrada");
  }

  const lead = await prisma.lead.create({
    data: {
      firstName,
      lastName: lastName || null,
      phone1,
      phone2: phone2 || null,
      ssn: encryptedSsn,
      address: address || null,
      city: city || null,
      state: state || null,
      zipCode: zipCode || null,
      email: email || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      contactTime: contactTime || null,
      companyId,
      teamId,
      assignedToId,
    },
  });

  return NextResponse.json({ ...lead, ssn }, { status: 201 });
});
