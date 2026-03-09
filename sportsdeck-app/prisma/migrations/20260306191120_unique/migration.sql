/*
  Warnings:

  - A unique constraint covering the columns `[matchdayNumber,season,stage]` on the table `Matchday` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Matchday_matchdayNumber_season_stage_key" ON "Matchday"("matchdayNumber", "season", "stage");
