import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/feed:
 *   get:
 *     summary: Get the authenticated user's personalized activity feed
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 20
 *     responses:
 *       200:
 *         description: List of grouped feed entries
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/feed
 *
 * User Story:
 * As a user, I want my feed to group related events so that I do not
 * get overwhelmed by many notifications about the same post or thread.
 *
 * Implementation:
 * Feed entries reference grouped events stored in FEED_EVENT.
 * Multiple activities are aggregated into one feed item via groupKey.
 *
 * Tables used:
 * FEED_ENTRY
 * FEED_EVENT
 *
 * Example grouped events:
 * - "5 new replies on your post"
 * - "3 new posts from users you follow"
 * - "2 new threads in your favorite team's forum"
 */

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getUserFromToken(req)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    const limit = Number(searchParams.get("limit") ?? 20)

    const entries = await prisma.feedEntry.findMany({
      where: {
        userId: currentUser.id
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      include: {
        feedEvent: true
      }
    })

    return NextResponse.json(entries)

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}