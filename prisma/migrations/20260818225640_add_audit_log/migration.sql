-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_LOCKED_OUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'LEAD_CREATED', 'LEAD_UPDATED', 'PRODUCT_CREATED', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED', 'COMPANY_CREATED', 'COMPANY_UPDATED', 'TEAM_CREATED', 'TEAM_UPDATED', 'ACCESS_DENIED');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" INTEGER,
    "actorRole" "Role",
    "actorName" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
