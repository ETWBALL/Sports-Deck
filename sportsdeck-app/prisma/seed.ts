
import { PrismaClient } from "../src/generated/prisma"

import seedUsers from "./seeds/users"
import { main as seedTeams } from "./seeds/teams"
import seedMatches from "./seeds/matches"
import seedThreads from "./seeds/threads"
import seedPosts from "./seeds/posts"
import seedPolls from "./seeds/polls"
import seedFollows from "./seeds/follows"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clear in reverse dependency order
  await prisma.feedEntry.deleteMany();
  await prisma.feedEvent.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.ban.deleteMany();
  await prisma.adminAction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.reportedItem.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.replyVersion.deleteMany();
  await prisma.reply.deleteMany();
  await prisma.postVersion.deleteMany();
  await prisma.post.deleteMany();
  await prisma.threadTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.standing.deleteMany();
  await prisma.match.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.dailyDigest.deleteMany();

  // Seed in dependency order
  const users = await seedUsers(prisma)
  const teams = await seedTeams(prisma)
  const matches = await seedMatches(prisma, teams)
  const threads = await seedThreads(prisma, users, teams, matches)
  const posts = await seedPosts(prisma, users, threads)
  await seedPolls(prisma, threads)
  await seedFollows(prisma, users)

  console.log("Seeding complete.")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
