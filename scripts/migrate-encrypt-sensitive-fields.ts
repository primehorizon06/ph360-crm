import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { PrismaClient } from "@prisma/client";
import { encryptDeterministic, encryptRandom, decrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function isEncrypted(v: string | null): boolean {
  return !!v && v.startsWith("enc:v1:");
}

async function migrateLeadsSsn() {
  const leads = await prisma.lead.findMany({
    where: { ssn: { not: null } },
    select: { id: true, ssn: true },
  });

  const pending = leads.filter((l) => l.ssn && !isEncrypted(l.ssn));
  console.log(`SSN: ${leads.length} leads con SSN, ${pending.length} pendientes de cifrar`);

  if (!APPLY) return;

  for (const lead of pending) {
    const encrypted = encryptDeterministic(lead.ssn!);
    if (decrypt(encrypted) !== lead.ssn) {
      throw new Error(`Round-trip de cifrado falló para lead ${lead.id}, abortando sin escribir`);
    }
    await prisma.lead.update({ where: { id: lead.id }, data: { ssn: encrypted } });
    console.log(`  lead ${lead.id}: ssn cifrado`);
  }
}

async function migratePaymentMethods() {
  const methods = await prisma.paymentMethod.findMany({
    where: { OR: [{ accountNumber: { not: null } }, { routingNumber: { not: null } }] },
    select: { id: true, accountNumber: true, routingNumber: true },
  });

  const pending = methods.filter(
    (m) =>
      (m.accountNumber && !isEncrypted(m.accountNumber)) ||
      (m.routingNumber && !isEncrypted(m.routingNumber)),
  );
  console.log(
    `Cuentas bancarias: ${methods.length} métodos de pago con datos, ${pending.length} pendientes de cifrar`,
  );

  if (!APPLY) return;

  for (const m of pending) {
    const accountNumber =
      m.accountNumber && !isEncrypted(m.accountNumber)
        ? encryptRandom(m.accountNumber)
        : m.accountNumber;
    const routingNumber =
      m.routingNumber && !isEncrypted(m.routingNumber)
        ? encryptRandom(m.routingNumber)
        : m.routingNumber;

    if (accountNumber && decrypt(accountNumber) !== m.accountNumber)
      throw new Error(`Round-trip falló para paymentMethod ${m.id} (accountNumber), abortando`);
    if (routingNumber && decrypt(routingNumber) !== m.routingNumber)
      throw new Error(`Round-trip falló para paymentMethod ${m.id} (routingNumber), abortando`);

    await prisma.paymentMethod.update({
      where: { id: m.id },
      data: { accountNumber, routingNumber },
    });
    console.log(`  paymentMethod ${m.id}: cuenta/ruta cifradas`);
  }
}

async function main() {
  console.log(
    APPLY
      ? "Modo APLICAR: se escribirán cambios en la base de datos"
      : "Modo DRY-RUN: solo se reportan conteos, no se escribe nada (usa --apply para ejecutar)",
  );
  await migrateLeadsSsn();
  await migratePaymentMethods();
  console.log("Listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
