/*
  Warnings:

  - You are about to drop the `GeneratedDocument` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "GeneratedDocument" DROP CONSTRAINT "GeneratedDocument_generatedById_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedDocument" DROP CONSTRAINT "GeneratedDocument_leadId_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedDocument" DROP CONSTRAINT "GeneratedDocument_productId_fkey";

-- DropTable
DROP TABLE "GeneratedDocument";
