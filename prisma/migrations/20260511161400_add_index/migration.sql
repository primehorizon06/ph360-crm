-- CreateIndex
CREATE INDEX "Installment_paidAt_idx" ON "Installment"("paidAt");

-- CreateIndex
CREATE INDEX "Installment_status_idx" ON "Installment"("status");

-- CreateIndex
CREATE INDEX "Lead_type_companyId_idx" ON "Lead"("type", "companyId");

-- CreateIndex
CREATE INDEX "Lead_type_teamId_idx" ON "Lead"("type", "teamId");

-- CreateIndex
CREATE INDEX "Lead_type_assignedToId_idx" ON "Lead"("type", "assignedToId");

-- CreateIndex
CREATE INDEX "Lead_type_convertedAt_idx" ON "Lead"("type", "convertedAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
