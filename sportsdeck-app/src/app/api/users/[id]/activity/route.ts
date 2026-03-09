import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * @openapi
 * /api/users/{id}/activity:
 *   get:
 *     summary: Get a user's daily activity counts over a specified time range
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxuser789"
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         example: "30d"
 *     responses:
 *       200:
 *         description: Daily activity data including posts, replies, and totals
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/users/:id/activity
 *
 * User Story:
 * As a visitor, I want to see the activity chart of a user over a
 * certain period of time. Activity is determined by the number of
 * posts and replies authored by the user.
 *
 * Access:
 * Public endpoint — authentication not required.
 *
 * Query Parameters:
 * range = 7d | 30d | 90d | 1y
 *
 * What this endpoint returns:
 * Daily activity counts for the specified period including:
 * - number of posts created
 * - number of replies created
 * - total activity
 *
 * Prisma tables used:
 * - Post
 * - Reply
 *
 * Notes:
 * - Hidden content is excluded
 * - Data is grouped by day
 * - Designed to power a frontend activity chart
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") ?? "30d"

    let days = 30

    if (range === "7d") days = 7
    if (range === "90d") days = 90
    if (range === "1y") days = 365

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch posts
    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
        isHidden: false,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    })

    // Fetch replies
    const replies = await prisma.reply.findMany({
      where: {
        authorId: userId,
        isHidden: false,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    })

    const activityMap: Record<
      string,
      { posts: number; replies: number }
    > = {}

    // Aggregate posts
    for (const post of posts) {
      const date = post.createdAt.toISOString().split("T")[0]

      if (!activityMap[date]) {
        activityMap[date] = { posts: 0, replies: 0 }
      }

      activityMap[date].posts++
    }

    // Aggregate replies
    for (const reply of replies) {
      const date = reply.createdAt.toISOString().split("T")[0]

      if (!activityMap[date]) {
        activityMap[date] = { posts: 0, replies: 0 }
      }

      activityMap[date].replies++
    }

    const result = Object.entries(activityMap).map(
      ([date, values]) => ({
        date,
        posts: values.posts,
        replies: values.replies,
        total: values.posts + values.replies,
      })
    )

    // Sort chronologically
    result.sort((a, b) => (a.date > b.date ? 1 : -1))

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}