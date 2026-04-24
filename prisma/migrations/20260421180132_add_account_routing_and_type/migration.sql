-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('AHORROS', 'CHEQUES');

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "accountType" "AccountType",
ADD COLUMN     "routingNumber" TEXT;
