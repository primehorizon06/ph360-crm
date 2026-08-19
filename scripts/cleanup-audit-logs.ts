import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const RETENTION_DAYS = 730;

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const count = await prisma.auditLog.count({ where: { createdAt: { lt: cutoff } } });
  console.log(
    `${APPLY ? "Modo APLICAR" : "Modo DRY-RUN"}: ${count} registros de auditoría anteriores a ${cutoff.toISOString()} (retención: ${RETENTION_DAYS} días)`,
  );

  if (!APPLY) {
    console.log("Nada se modificó. Usa --apply para borrar esos registros.");
    return;
  }

  const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  console.log(`Borrados ${result.count} registros.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
