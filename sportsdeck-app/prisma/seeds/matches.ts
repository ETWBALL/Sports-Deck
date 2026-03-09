import { PrismaClient } from "@prisma/client"

export default async function seedMatches(prisma: PrismaClient, teams: any[]) {

  const match = await prisma.match.create({
    data: {
      externalId: "match1",
      homeTeamId: teams[0].id,
      awayTeamId: teams[1].id,
      venue: "Emirates Stadium",
      status: "scheduled",
      matchDate: new Date(),
      cachedAt: new Date(),
      matchday: 5,
      season: "2025",
      stage: "regular"
    }
  })

  return [match]
}
