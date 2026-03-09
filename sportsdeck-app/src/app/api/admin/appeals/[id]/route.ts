import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/admin/appeals/{id}:
 *   get:
 *     summary: Get details of a specific appeal (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxappeal001"
 *     responses:
 *       200:
 *         description: Appeal details with user, ban, and admin info
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Appeal not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Approve or reject a ban appeal (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxappeal001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 example: "approved"
 *               decisionNote:
 *                 type: string
 *                 example: "After review, the ban was found to be unwarranted."
 *     responses:
 *       200:
 *         description: Appeal reviewed; if approved, ban is lifted
 *       400:
 *         description: Missing or invalid status, or appeal already reviewed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Appeal not found
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/admin/appeals/:id
 *
 * Admin-only. Returns details of a specific appeal.
 */
export async function GET(
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

  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: {
      appealer: { select: { id: true, username: true, email: true } },
      ban: {
        include: {
          user: { select: { id: true, username: true, email: true, isBanned: true } },
          bannedByAdmin: { select: { id: true, username: true } },
          reportedItem: { select: { id: true, contentType: true, contentId: true, status: true } },
          report: { select: { id: true, reason: true, status: true } },
        },
      },
      reviewedByAdmin: { select: { id: true, username: true } },
    },
  })

  if (!appeal) {
    return NextResponse.json({ message: "Appeal not found" }, { status: 404 })
  }

  return NextResponse.json(appeal)
  } catch (error) {
    console.error("GET /api/admin/appeals/[id] error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/appeals/:id
 *
 * Admin-only. Review an appeal — approve or reject it.
 *
 * Body:
 * - status       (required) — "approved" or "rejected"
 * - decisionNote (optional) — explanation for the decision
 *
 * If approved:
 * - Sets appeal status to "approved"
 * - Lifts the associated ban (status → "lifted", liftedAt set)
 * - Sets user.isBanned = false
 *
 * If rejected:
 * - Sets appeal status to "rejected"
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

  const { id } = await params

  let body: { status?: string; decisionNote?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 })
  }

  const { status, decisionNote } = body

  if (!status) {
    return NextResponse.json(
      { message: "status is required" },
      { status: 400 }
    )
  }

  const allowedStatuses = ["approved", "rejected"]
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      { message: `status must be one of: ${allowedStatuses.join(", ")}` },
      { status: 400 }
    )
  }

  try {
  // Find the appeal
  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: { ban: true },
  })

  if (!appeal) {
    return NextResponse.json({ message: "Appeal not found" }, { status: 404 })
  }

  // Only pending appeals can be reviewed
  if (appeal.status !== "pending") {
    return NextResponse.json(
      { message: `Appeal has already been ${appeal.status}` },
      { status: 400 }
    )
  }

  // Perform the update atomically
  const updatedAppeal = await prisma.$transaction(async (tx) => {
    // Update the appeal record
    const updated = await tx.appeal.update({
      where: { id },
      data: {
        status,
        decisionNote: decisionNote ?? null,
        reviewedByAdminId: admin.user_id,
        reviewedAt: new Date(),
      },
      include: {
        appealer: { select: { id: true, username: true, email: true } },
        ban: {
          select: { id: true, reason: true, status: true, userId: true },
        },
        reviewedByAdmin: { select: { id: true, username: true } },
      },
    })

    // If approved, lift the ban and unban the user
    if (status === "approved" && appeal.ban.status === "active") {
      await tx.ban.update({
        where: { id: appeal.banId },
        data: {
          status: "lifted",
          liftedAt: new Date(),
        },
      })

      await tx.user.update({
        where: { id: appeal.ban.userId },
        data: { isBanned: false },
      })
    }

    return updated
  })

  const action = status === "approved" ? "approved and ban lifted" : "rejected"

  return NextResponse.json({
    message: `Appeal ${action} successfully`,
    appeal: updatedAppeal,
  })
  } catch (error) {
    console.error("PATCH /api/admin/appeals/[id] error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
