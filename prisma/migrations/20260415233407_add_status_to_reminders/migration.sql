/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Reminder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "updatedAt",
ADD COLUMN     "lastNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
