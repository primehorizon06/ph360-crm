/*
  Warnings:

  - You are about to drop the column `leadProductId` on the `PaymentMethod` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId]` on the table `PaymentMethod` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_leadProductId_fkey";

-- DropIndex
DROP INDEX "PaymentMethod_leadProductId_key";

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "leadProductId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_productId_key" ON "PaymentMethod"("productId");

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
