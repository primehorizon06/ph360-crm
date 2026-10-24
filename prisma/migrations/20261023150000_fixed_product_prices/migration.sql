-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SPECIAL_PRICE_AUTHORIZED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SPECIAL_PRICE_AUTHORIZED';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isSpecialPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "priceAuthorizedById" INTEGER;

UPDATE "Product" p
SET "price" = COALESCE((
    SELECT SUM(i."amount")
    FROM "PaymentPlan" pp
    JOIN "Installment" i ON i."paymentPlanId" = pp."id"
    WHERE pp."productId" = p."id"
), 0);

ALTER TABLE "Product" ALTER COLUMN "price" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductCatalog" ADD COLUMN     "listPrice" DECIMAL(10,2),
ADD COLUMN     "specialPrice" DECIMAL(10,2);

UPDATE "ProductCatalog" SET "listPrice" = "minValue";

ALTER TABLE "ProductCatalog" ALTER COLUMN "listPrice" SET NOT NULL,
DROP COLUMN "maxValue",
DROP COLUMN "minValue";

-- CreateIndex
CREATE INDEX "Product_priceAuthorizedById_idx" ON "Product"("priceAuthorizedById");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceAuthorizedById_fkey" FOREIGN KEY ("priceAuthorizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ProductCatalog" ("name", "listPrice", "specialPrice", "active", "color", "updatedAt") VALUES
    ('Protección Anual', 600, 399, true, 'cyan', CURRENT_TIMESTAMP),
    ('Optimización Crediticia', 600, 399, true, 'emerald', CURRENT_TIMESTAMP),
    ('Reparación de Crédito', 600, 399, true, 'amber', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE
SET "listPrice" = 600, "specialPrice" = 399, "active" = true, "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "ProductCatalog" SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" NOT IN ('Protección Anual', 'Optimización Crediticia', 'Reparación de Crédito');
