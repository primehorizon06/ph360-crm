-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INSTALLMENT_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'INSTALLMENT_RESCHEDULED';

-- AlterTable
ALTER TABLE "Installment" ADD COLUMN "suspendReason" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Installment_status_date_idx" ON "Installment"("status", "date");
