-- CreateTable
CREATE TABLE "Estimation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attributes" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Estimation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimationImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "contentType" TEXT NOT NULL,
    "blob" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "estimationId" TEXT NOT NULL,
    CONSTRAINT "EstimationImage_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuildingDimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "width" REAL NOT NULL,
    "length" REAL NOT NULL,
    "height" REAL NOT NULL,
    "totalInteriorWallsLength" REAL NOT NULL,
    "roofPitch" REAL NOT NULL,
    "soffitOverhangWidth" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "estimationId" TEXT NOT NULL,
    CONSTRAINT "BuildingDimensions_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_EstimationToTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EstimationToTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "Estimation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EstimationToTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TeamToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TeamToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TeamToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Estimation_ownerId_idx" ON "Estimation"("ownerId");

-- CreateIndex
CREATE INDEX "Estimation_ownerId_updatedAt_idx" ON "Estimation"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "EstimationImage_estimationId_idx" ON "EstimationImage"("estimationId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingDimensions_estimationId_key" ON "BuildingDimensions"("estimationId");

-- CreateIndex
CREATE UNIQUE INDEX "_EstimationToTeam_AB_unique" ON "_EstimationToTeam"("A", "B");

-- CreateIndex
CREATE INDEX "_EstimationToTeam_B_index" ON "_EstimationToTeam"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TeamToUser_AB_unique" ON "_TeamToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_TeamToUser_B_index" ON "_TeamToUser"("B");
