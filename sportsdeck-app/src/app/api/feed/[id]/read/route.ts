import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/feed/{id}/read:
 *   patch:
 *     summary: Mark a feed entry as read
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxfeed001"
 *     responses:
 *       200:
 *         description: Feed entry marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Feed entry not found
 *       500:
 *         description: Internal server error
 */

/**
 * PATCH /api/feed/:id/read
 *
 * User Story:
 * Allows a user to mark a feed notification or entry as read.
 *
 * Access:
 * Authenticated users only.
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getUserFromToken(req)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const feedId = params.id

    await prisma.feedEntry.update({
      where: { id: feedId },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}