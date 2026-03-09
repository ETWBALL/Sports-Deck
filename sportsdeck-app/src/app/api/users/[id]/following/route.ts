import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * @openapi
 * /api/users/{id}/following:
 *   get:
 *     summary: Get the list of users that a given user follows
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
 *         description: List of followed users with profile info
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/users/:id/following
 *
 * User Story:
 * As a visitor, I want to see the list of users that a given user follows.
 *
 * Access:
 * Public endpoint — authentication not required.
 *
 * Data source:
 * Uses the Follow table where:
 * - followerId = the user performing the follow
 * - followingId = the user being followed
 *
 * This endpoint retrieves all rows where followerId = :id.
 *
 * Prisma relation used:
 * Follow.following -> User
 *
 * Results are sorted by the time the follow action occurred.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        following: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    const result = following.map((f) => f.following)

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}