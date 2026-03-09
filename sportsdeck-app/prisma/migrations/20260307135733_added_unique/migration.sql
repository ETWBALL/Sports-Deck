/*
  Warnings:

  - A unique constraint covering the columns `[externalTeamId,season]` on the table `Standing` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Standing_teamId_season_key";

-- CreateIndex
CREATE UNIQUE INDEX "Standing_externalTeamId_season_key" ON "Standing"("externalTeamId", "season");
