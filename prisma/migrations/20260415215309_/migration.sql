-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('ALL', 'COMPANY', 'TEAM', 'OWN', 'NONE');

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "role" "Role" NOT NULL,
    "module" TEXT NOT NULL,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canRead" "PermissionScope" NOT NULL DEFAULT 'NONE',
    "canUpdate" "PermissionScope" NOT NULL DEFAULT 'NONE',
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_role_module_key" ON "Permission"("role", "module");
