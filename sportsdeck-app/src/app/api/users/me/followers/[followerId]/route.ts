import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/users/me/followers/{followerId}:
 *   delete:
 *     summary: Remove a follower from the authenticated user's follower list
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followerId
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxuser456"
 *     responses:
 *       200:
 *         description: Follower removed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * DELETE /api/users/me/followers/:followerId
 *
 * User Story:
 * As a user, I want to remove a follower that I do not like.
 *
 * Access:
 * Authenticated users only.
 *
 * Behavior:
 * - Deletes the follow relationship where the target user
 *   follows the current user.
 */

export async function DELETE(
  req: NextRequest,
  { params }: { params: { followerId: string } }
) {
  try {
    const currentUser = await getUserFromToken(req)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.follow.deleteMany({
      where: {
        followerId: params.followerId,
        followingId: currentUser.id
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