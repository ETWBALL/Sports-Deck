import { PrismaClient } from "@prisma/client"

export default async function seedThreads(prisma: PrismaClient, users: any[], teams: any[], matches: any[]) {

  const thread1 = await prisma.thread.create({
    data: {
      title: "Arsenal vs Liverpool Match Discussion",
      authorId: users[0].id,
      matchId: matches[0].id,
      isMatchThread: true
    }
  })

  const thread2 = await prisma.thread.create({
    data: {
      title: "Arsenal Season Predictions",
      authorId: users[1].id,
      teamId: teams[0].id
    }
  })

  return [thread1, thread2]
}
