-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "quincena" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "companyId" INTEGER,
    "teamId" INTEGER,
    "userId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Goal_year_month_quincena_companyId_key" ON "Goal"("year", "month", "quincena", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_year_month_quincena_teamId_key" ON "Goal"("year", "month", "quincena", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_year_month_quincena_userId_key" ON "Goal"("year", "month", "quincena", "userId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
