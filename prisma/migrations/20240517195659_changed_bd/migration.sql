/*
  Warnings:

  - You are about to drop the column `height` on the `BuildingDimensions` table. All the data in the column will be lost.
  - You are about to drop the column `roofPitch` on the `BuildingDimensions` table. All the data in the column will be lost.
  - Added the required column `roofRisePerFoot` to the `BuildingDimensions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wallHeight` to the `BuildingDimensions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BuildingDimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "width" REAL NOT NULL,
    "length" REAL NOT NULL,
    "wallHeight" REAL NOT NULL,
    "totalInteriorWallsLength" REAL NOT NULL,
    "roofRisePerFoot" REAL NOT NULL,
    "soffitOverhangWidth" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "estimationId" TEXT NOT NULL,
    CONSTRAINT "BuildingDimensions_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BuildingDimensions" ("createdAt", "estimationId", "id", "length", "soffitOverhangWidth", "totalInteriorWallsLength", "updatedAt", "width") SELECT "createdAt", "estimationId", "id", "length", "soffitOverhangWidth", "totalInteriorWallsLength", "updatedAt", "width" FROM "BuildingDimensions";
DROP TABLE "BuildingDimensions";
ALTER TABLE "new_BuildingDimensions" RENAME TO "BuildingDimensions";
CREATE UNIQUE INDEX "BuildingDimensions_estimationId_key" ON "BuildingDimensions"("estimationId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
