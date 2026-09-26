-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_CATALOG_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_CATALOG_UPDATED';

-- CreateTable
CREATE TABLE "ProductCatalog" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "minValue" DECIMAL(10,2) NOT NULL,
    "maxValue" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL DEFAULT 'cyan',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCatalog_name_key" ON "ProductCatalog"("name");

INSERT INTO "ProductCatalog" ("name", "minValue", "maxValue", "color", "updatedAt") VALUES
    ('Alerta Anual', 0, NULL, 'cyan', CURRENT_TIMESTAMP),
    ('Alerta Trimestral', 0, NULL, 'violet', CURRENT_TIMESTAMP),
    ('Reparación de Crédito', 0, NULL, 'amber', CURRENT_TIMESTAMP),
    ('Fortalecimiento Financiero', 0, NULL, 'emerald', CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "catalogId" INTEGER;

UPDATE "Product" p
SET "catalogId" = c."id"
FROM "ProductCatalog" c
WHERE c."name" = CASE p."product"::text
    WHEN 'ALERTA_ANUAL' THEN 'Alerta Anual'
    WHEN 'ALERTA_TRIMESTRAL' THEN 'Alerta Trimestral'
    WHEN 'REPARACION_CREDITO' THEN 'Reparación de Crédito'
    WHEN 'FORTALECIMIENTO_FINANCIERO' THEN 'Fortalecimiento Financiero'
END;

ALTER TABLE "Product" ALTER COLUMN "catalogId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "product";

-- DropEnum
DROP TYPE "ProductType";

-- CreateIndex
CREATE INDEX "Product_catalogId_idx" ON "Product"("catalogId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "ProductCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
