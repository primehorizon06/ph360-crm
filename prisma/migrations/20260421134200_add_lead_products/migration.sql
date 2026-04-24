-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('ALERTA_ANUAL', 'ALERTA_TRIMESTRAL', 'REPARACION_CREDITO', 'FORTALECIMIENTO_FINANCIERO');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('TARJETA', 'CUENTA');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('DEBITO', 'CREDITO');

-- CreateTable
CREATE TABLE "LeadProduct" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "product" "ProductType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadPaymentMethod" (
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

    CONSTRAINT "LeadPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadPaymentMethod_leadProductId_key" ON "LeadPaymentMethod"("leadProductId");

-- AddForeignKey
ALTER TABLE "LeadProduct" ADD CONSTRAINT "LeadProduct_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPaymentMethod" ADD CONSTRAINT "LeadPaymentMethod_leadProductId_fkey" FOREIGN KEY ("leadProductId") REFERENCES "LeadProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
