/*
  Warnings:

  - You are about to drop the `Matchday` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `matchdayId` on the `Match` table. All the data in the column will be lost.
  - Added the required column `matchday` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `season` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stage` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Matchday_matchdayNumber_season_stage_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Matchday";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "matchDate" DATETIME NOT NULL,
    "cachedAt" DATETIME NOT NULL,
    "matchday" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("awayScore", "awayTeamId", "cachedAt", "externalId", "homeScore", "homeTeamId", "id", "matchDate", "status", "venue") SELECT "awayScore", "awayTeamId", "cachedAt", "externalId", "homeScore", "homeTeamId", "id", "matchDate", "status", "venue" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");
CREATE INDEX "Match_matchDate_idx" ON "Match"("matchDate");
CREATE INDEX "Match_matchday_season_idx" ON "Match"("matchday", "season");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
