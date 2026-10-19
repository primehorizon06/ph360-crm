-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INSTALLMENT_CANCELLED';

-- AlterTable
ALTER TABLE "Installment" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT;
