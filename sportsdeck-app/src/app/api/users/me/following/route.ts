import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/users/me/following:
 *   get:
 *     summary: Get the list of users the authenticated user is following
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of followed users with profile info
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/users/me/following
 *
 * User Story:
 * As a user, I want to view the list of users I am following.
 *
 * Access:
 * Authenticated users only.
 *
 * Behavior:
 * - Returns all users the current user follows.
 * - Sorted by follow time (most recent first).
 *
 * Tables used:
 * FOLLOW
 * USER
 */

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getUserFromToken(req)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const following = await prisma.follow.findMany({
      where: {
        followerId: currentUser.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json(following)

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}