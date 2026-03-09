/*
  Warnings:

  - A unique constraint covering the columns `[teamId,season]` on the table `Standing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Standing_teamId_season_key" ON "Standing"("teamId", "season");
