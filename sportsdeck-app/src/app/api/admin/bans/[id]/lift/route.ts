import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/admin/bans/{id}/lift:
 *   patch:
 *     summary: Lift (unban) an active ban (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxban001"
 *     responses:
 *       200:
 *         description: Ban lifted and user unbanned
 *       400:
 *         description: Ban is not active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ban not found
 *       500:
 *         description: Internal server error
 */

/**
 * PATCH /api/admin/bans/:id/lift
 *
 * Admin-only. Lifts (unbans) a user by:
 * - Setting the Ban record status to "lifted" and recording liftedAt timestamp
 * - Setting user.isBanned = false
 *
 * Only active bans can be lifted.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getUserFromToken(request)
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  try {
  const { id } = await params

  // Find the ban
  const ban = await prisma.ban.findUnique({ where: { id } })
  if (!ban) {
    return NextResponse.json({ message: "Ban not found" }, { status: 404 })
  }

  // Can only lift active bans
  if (ban.status !== "active") {
    return NextResponse.json(
      { message: `Ban is already ${ban.status}` },
      { status: 400 }
    )
  }

  // Lift the ban and unban the user atomically
  const updatedBan = await prisma.$transaction(async (tx) => {
    // Set user as unbanned
    await tx.user.update({
      where: { id: ban.userId },
      data: { isBanned: false },
    })

    // Update ban record
    const lifted = await tx.ban.update({
      where: { id },
      data: {
        status: "lifted",
        liftedAt: new Date(),
      },
      include: {
        user: { select: { id: true, username: true, email: true, isBanned: true } },
        bannedByAdmin: { select: { id: true, username: true } },
      },
    })

    return lifted
  })

  return NextResponse.json({
    message: "Ban lifted successfully",
    ban: updatedBan,
  })
  } catch (error) {
    console.error("PATCH /api/admin/bans/[id]/lift error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
