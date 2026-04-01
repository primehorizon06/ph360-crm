import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");
    const moduleName = searchParams.get("module");

    if (!role || !moduleName) {
      return NextResponse.json(
        { error: "Faltan parámetros role o module" },
        { status: 400 }
      );
    }

    const permission = await prisma.permission.findUnique({
      where: {
        role_module: {
          role: role as any,
          module: moduleName, // Usar moduleName aquí
        },
      },
    });

    if (!permission) {
      // Devolver permisos por defecto si no existen
      return NextResponse.json({
        canCreate: false,
        canRead: "NONE",
        canUpdate: "NONE",
        canDelete: false,
      });
    }

    return NextResponse.json({
      canCreate: permission.canCreate,
      canRead: permission.canRead,
      canUpdate: permission.canUpdate,
      canDelete: permission.canDelete,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}