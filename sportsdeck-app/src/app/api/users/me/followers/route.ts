import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/users/me/followers:
 *   get:
 *     summary: Get the list of users who follow the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of followers with profile info
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/users/me/followers
 *
 * User Story:
 * As a user, I want to see the list of users who follow me.
 *
 * Access:
 * Authenticated users only.
 *
 * Behavior:
 * - Returns followers sorted by follow time.
 */

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getUserFromToken(req)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const followers = await prisma.follow.findMany({
      where: {
        followingId: currentUser.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json(followers)

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}