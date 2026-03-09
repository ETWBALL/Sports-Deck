/*
  Warnings:

  - Added the required column `type` to the `Standing` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Standing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "externalTeamId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "played" INTEGER NOT NULL,
    "won" INTEGER NOT NULL,
    "drawn" INTEGER NOT NULL,
    "lost" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "cachedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Standing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Standing" ("cachedAt", "drawn", "externalTeamId", "goalsAgainst", "goalsFor", "id", "lost", "played", "points", "position", "season", "teamId", "won") SELECT "cachedAt", "drawn", "externalTeamId", "goalsAgainst", "goalsFor", "id", "lost", "played", "points", "position", "season", "teamId", "won" FROM "Standing";
DROP TABLE "Standing";
ALTER TABLE "new_Standing" RENAME TO "Standing";
CREATE UNIQUE INDEX "Standing_externalTeamId_season_key" ON "Standing"("externalTeamId", "season");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
