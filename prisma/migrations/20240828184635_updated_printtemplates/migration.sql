/*
  Warnings:

  - You are about to drop the column `logoUrl` on the `PrintTemplate` table. All the data in the column will be lost.
  - Added the required column `companyName` to the `PrintTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `greeting` to the `PrintTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "LogoImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "contentType" TEXT NOT NULL,
    "blob" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "LogoImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PrintTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyInfo" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "logoImageId" TEXT,
    "takeoffModelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrintTemplate_logoImageId_fkey" FOREIGN KEY ("logoImageId") REFERENCES "LogoImage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrintTemplate_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PrintTemplate" ("bodyTemplate", "companyInfo", "createdAt", "id", "name", "takeoffModelId", "updatedAt") SELECT "bodyTemplate", "companyInfo", "createdAt", "id", "name", "takeoffModelId", "updatedAt" FROM "PrintTemplate";
DROP TABLE "PrintTemplate";
ALTER TABLE "new_PrintTemplate" RENAME TO "PrintTemplate";
CREATE INDEX "PrintTemplate_takeoffModelId_idx" ON "PrintTemplate"("takeoffModelId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
