-- AlterTable
ALTER TABLE "ProductApproval" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Las aprobaciones existentes toman su última actualización como fecha de aprobación.
UPDATE "ProductApproval" SET "approvedAt" = "updatedAt" WHERE "status" = 'APPROVED';
