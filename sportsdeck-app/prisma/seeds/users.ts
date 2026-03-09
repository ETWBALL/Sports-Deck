import { PrismaClient } from "@prisma/client";

export default async function seedUsers(prisma: PrismaClient) {
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "abu@sportsdeck.com",
        username: "abu",
        role: "ADMIN"
      }
    }),
    prisma.user.create({
      data: {
        email: "arsenal@sportsdeck.com",
        username: "arsenalFan"
      }
    }),
    prisma.user.create({
      data: {
        email: "liverpool@sportsdeck.com",
        username: "lfcFan"
      }
    }),
    prisma.user.create({
      data: {
        email: "chelsea@sportsdeck.com",
        username: "chelseaFan"
      }
    })
  ])

  return users
}
