-- Preserve existing estimates and their relationships during the rename.
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
ALTER TABLE "Estimation" RENAME TO "Estimate";
ALTER TABLE "_EstimationToTeam" RENAME TO "_EstimateToTeam";

-- Rebuild to rename title, make attributes optional, and add model selection.
CREATE TABLE "new_Estimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "attributes" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    "takeoffModelId" TEXT,
    CONSTRAINT "Estimate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Estimate_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Estimate" ("id", "name", "description", "attributes", "status", "createdAt", "updatedAt", "ownerId")
SELECT "id", "title", "description", "attributes", "status", "createdAt", "updatedAt", "ownerId" FROM "Estimate";
DROP TABLE "Estimate";
ALTER TABLE "new_Estimate" RENAME TO "Estimate";

DROP INDEX "_EstimationToTeam_AB_unique";
DROP INDEX "_EstimationToTeam_B_index";
CREATE INDEX "Estimate_ownerId_idx" ON "Estimate"("ownerId");
CREATE INDEX "Estimate_ownerId_updatedAt_idx" ON "Estimate"("ownerId", "updatedAt");
CREATE UNIQUE INDEX "_EstimateToTeam_AB_unique" ON "_EstimateToTeam"("A", "B");
CREATE INDEX "_EstimateToTeam_B_index" ON "_EstimateToTeam"("B");

ALTER TABLE "TakeoffModel" ADD COLUMN "code" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomInputElement" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CustomVariable" ADD COLUMN "isManuallyCreated" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "CustomVariable_takeoffModelId_name_key" ON "CustomVariable"("takeoffModelId", "name");

CREATE TABLE "EstimateResults" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceLookupKey" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "section" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "estimateId" TEXT NOT NULL,
    CONSTRAINT "EstimateResults_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EstimateResults_estimateId_name_key" ON "EstimateResults"("estimateId", "name");

CREATE TABLE "EstimateFormData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "estimateId" TEXT NOT NULL,
    CONSTRAINT "EstimateFormData_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EstimateFormData_estimateId_name_key" ON "EstimateFormData"("estimateId", "name");

-- Retain legacy Note, NoteImage, and EstimationImage tables and their data.
-- They have no current application consumers; dropping them is not required.
COMMIT;
PRAGMA foreign_keys=ON;
