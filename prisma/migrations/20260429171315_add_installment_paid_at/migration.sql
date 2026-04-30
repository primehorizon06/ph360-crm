-- AlterTable
ALTER TABLE "Installment" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING';
