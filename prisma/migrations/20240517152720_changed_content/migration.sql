/*
  Warnings:

  - You are about to drop the column `content` on the `Estimation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Estimation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "attributes" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Estimation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Estimation" ("attributes", "createdAt", "id", "ownerId", "status", "title", "updatedAt") SELECT "attributes", "createdAt", "id", "ownerId", "status", "title", "updatedAt" FROM "Estimation";
DROP TABLE "Estimation";
ALTER TABLE "new_Estimation" RENAME TO "Estimation";
CREATE INDEX "Estimation_ownerId_idx" ON "Estimation"("ownerId");
CREATE INDEX "Estimation_ownerId_updatedAt_idx" ON "Estimation"("ownerId", "updatedAt");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
