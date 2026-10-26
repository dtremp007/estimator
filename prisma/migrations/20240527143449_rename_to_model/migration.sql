/*
  Warnings:

  - You are about to drop the `CustomCalculation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomCalculation";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TakeoffModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "TakeoffModel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TakeoffModelToTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TakeoffModelToTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "TakeoffModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TakeoffModelToTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomVariable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customCalculationId" TEXT NOT NULL,
    CONSTRAINT "CustomVariable_customCalculationId_fkey" FOREIGN KEY ("customCalculationId") REFERENCES "TakeoffModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomVariable" ("createdAt", "customCalculationId", "description", "id", "name", "type", "updatedAt", "value") SELECT "createdAt", "customCalculationId", "description", "id", "name", "type", "updatedAt", "value" FROM "CustomVariable";
DROP TABLE "CustomVariable";
ALTER TABLE "new_CustomVariable" RENAME TO "CustomVariable";
CREATE TABLE "new_CustomInputElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "defaultValue" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "props" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customCalculationId" TEXT NOT NULL,
    CONSTRAINT "CustomInputElement_customCalculationId_fkey" FOREIGN KEY ("customCalculationId") REFERENCES "TakeoffModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomInputElement" ("createdAt", "customCalculationId", "defaultValue", "description", "id", "label", "name", "props", "type", "updatedAt") SELECT "createdAt", "customCalculationId", "defaultValue", "description", "id", "label", "name", "props", "type", "updatedAt" FROM "CustomInputElement";
DROP TABLE "CustomInputElement";
ALTER TABLE "new_CustomInputElement" RENAME TO "CustomInputElement";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "_TakeoffModelToTeam_AB_unique" ON "_TakeoffModelToTeam"("A", "B");

-- CreateIndex
CREATE INDEX "_TakeoffModelToTeam_B_index" ON "_TakeoffModelToTeam"("B");
