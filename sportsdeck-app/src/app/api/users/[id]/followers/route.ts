import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * @openapi
 * /api/users/{id}/followers:
 *   get:
 *     summary: Get the list of users who follow a given user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxuser789"
 *     responses:
 *       200:
 *         description: List of followers with profile info
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/users/:id/followers
 *
 * User Story:
 * As a visitor, I want to see the list of users who follow a given user.
 *
 * Access:
 * Public endpoint — authentication not required.
 *
 * Data source:
 * Uses the Follow table where:
 * - followerId = user who performs the follow
 * - followingId = user being followed
 *
 * This endpoint retrieves all rows where followingId = :id.
 *
 * Prisma relation used:
 * Follow.follower -> User
 *
 * Results include follower profile info and are sorted by
 * the most recent follow action.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        follower: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    const result = followers.map((f) => f.follower)

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}