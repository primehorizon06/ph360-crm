import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Asegurar que PrismaClient se instancia correctamente
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Verificar que prisma no es undefined
if (!prisma) {
  throw new Error("Failed to initialize Prisma Client");
}
