/*
  Warnings:

  - You are about to drop the column `ProductId` on the `PaymentPlan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId]` on the table `PaymentPlan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `PaymentPlan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PaymentPlan" DROP CONSTRAINT "PaymentPlan_ProductId_fkey";

-- DropIndex
DROP INDEX "PaymentPlan_ProductId_key";

-- AlterTable
ALTER TABLE "PaymentPlan" DROP COLUMN "ProductId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPlan_productId_key" ON "PaymentPlan"("productId");

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
