-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "conversionNote" TEXT,
ADD COLUMN     "conversionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "conversionStatus" "ConversionStatus";

-- CreateTable
CREATE TABLE "ProductApproval" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "leadId" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "isFirstProduct" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductApproval_productId_key" ON "ProductApproval"("productId");

-- AddForeignKey
ALTER TABLE "ProductApproval" ADD CONSTRAINT "ProductApproval_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApproval" ADD CONSTRAINT "ProductApproval_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
