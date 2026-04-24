/*
  Warnings:

  - You are about to drop the `LeadPaymentMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeadProduct` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LeadPaymentMethod" DROP CONSTRAINT "LeadPaymentMethod_leadProductId_fkey";

-- DropForeignKey
ALTER TABLE "LeadProduct" DROP CONSTRAINT "LeadProduct_leadId_fkey";

-- DropTable
DROP TABLE "LeadPaymentMethod";

-- DropTable
DROP TABLE "LeadProduct";

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "product" "ProductType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "leadProductId" INTEGER NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "cardType" "CardType",
    "lastFour" TEXT,
    "holderName" TEXT,
    "bank" TEXT,
    "accountNumber" TEXT,
    "accountHolder" TEXT,
    "accountBank" TEXT,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_leadProductId_key" ON "PaymentMethod"("leadProductId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_leadProductId_fkey" FOREIGN KEY ("leadProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
