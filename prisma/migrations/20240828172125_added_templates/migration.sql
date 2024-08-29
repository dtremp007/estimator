-- CreateTable
CREATE TABLE "PrintTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyInfo" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "logoUrl" TEXT,
    "takeoffModelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrintTemplate_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PrintTemplate_takeoffModelId_idx" ON "PrintTemplate"("takeoffModelId");
