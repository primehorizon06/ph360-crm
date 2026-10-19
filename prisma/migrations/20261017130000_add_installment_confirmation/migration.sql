-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INSTALLMENT_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'INSTALLMENT_UNCONFIRMED';

-- AlterTable
ALTER TABLE "Installment" ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "confirmedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
