/*
  Warnings:

  - You are about to drop the column `customCalculationId` on the `CustomInputElement` table. All the data in the column will be lost.
  - You are about to drop the column `customCalculationId` on the `CustomVariable` table. All the data in the column will be lost.
  - Added the required column `takeoffModelId` to the `CustomInputElement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `takeoffModelId` to the `CustomVariable` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    "takeoffModelId" TEXT NOT NULL,
    CONSTRAINT "CustomInputElement_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomInputElement" ("createdAt", "defaultValue", "description", "id", "label", "name", "props", "type", "updatedAt") SELECT "createdAt", "defaultValue", "description", "id", "label", "name", "props", "type", "updatedAt" FROM "CustomInputElement";
DROP TABLE "CustomInputElement";
ALTER TABLE "new_CustomInputElement" RENAME TO "CustomInputElement";
CREATE TABLE "new_CustomVariable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "takeoffModelId" TEXT NOT NULL,
    CONSTRAINT "CustomVariable_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomVariable" ("createdAt", "description", "id", "name", "type", "updatedAt", "value") SELECT "createdAt", "description", "id", "name", "type", "updatedAt", "value" FROM "CustomVariable";
DROP TABLE "CustomVariable";
ALTER TABLE "new_CustomVariable" RENAME TO "CustomVariable";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
