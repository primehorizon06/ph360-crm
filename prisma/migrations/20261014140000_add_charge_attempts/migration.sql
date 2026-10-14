-- CreateEnum
CREATE TYPE "Processor" AS ENUM ('SOAR_ACH', 'AUTHNET_CARD');

-- CreateEnum
CREATE TYPE "ChargeAttemptStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED', 'VOIDED', 'CHARGEBACK');

-- AlterEnum
ALTER TYPE "InstallmentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "InstallmentStatus" ADD VALUE 'CHARGEBACK';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'CHARGE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHARGE_VOIDED';
ALTER TYPE "AuditAction" ADD VALUE 'SOAR_CUSTOMER_SYNCED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "soarCustomerId" TEXT;

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN "soarAccountId" TEXT,
ADD COLUMN "soarSyncError" TEXT;

-- CreateTable
CREATE TABLE "ChargeAttempt" (
    "id" SERIAL NOT NULL,
    "installmentId" INTEGER NOT NULL,
    "processor" "Processor" NOT NULL,
    "externalId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "ChargeAttemptStatus" NOT NULL,
    "rawStatus" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "chargedById" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER,
    "processor" "Processor" NOT NULL,
    "eventId" TEXT,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChargeAttempt_installmentId_idx" ON "ChargeAttempt"("installmentId");

-- CreateIndex
CREATE INDEX "ChargeAttempt_status_idx" ON "ChargeAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChargeAttempt_processor_externalId_key" ON "ChargeAttempt"("processor", "externalId");

-- CreateIndex
CREATE INDEX "PaymentEvent_externalId_idx" ON "PaymentEvent"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_processor_eventId_key" ON "PaymentEvent"("processor", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_soarCustomerId_key" ON "Lead"("soarCustomerId");

-- AddForeignKey
ALTER TABLE "ChargeAttempt" ADD CONSTRAINT "ChargeAttempt_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeAttempt" ADD CONSTRAINT "ChargeAttempt_chargedById_fkey" FOREIGN KEY ("chargedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ChargeAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
