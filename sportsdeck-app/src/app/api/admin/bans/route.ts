import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/admin/bans:
 *   post:
 *     summary: Ban a user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, reason]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "clxuser789"
 *               reason:
 *                 type: string
 *                 example: "Repeated violations of community guidelines."
 *               reportedItemId:
 *                 type: string
 *                 example: "clxreporteditem001"
 *               reportId:
 *                 type: string
 *                 example: "clxreport001"
 *     responses:
 *       201:
 *         description: Ban created
 *       400:
 *         description: Missing fields, user is an admin, or invalid reported item/report ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an admin)
 *       404:
 *         description: User, reported item, or report not found
 *       409:
 *         description: User is already banned
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: List bans with optional status filter and pagination (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, lifted]
 *         example: "active"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 20
 *     responses:
 *       200:
 *         description: Paginated list of bans
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */

/**
 * POST /api/admin/bans
 *
 * Admin creates a ban on a user.
 *
 * Body:
 * - userId       (required) — the user to ban
 * - reason       (required) — explanation for the ban
 * - reportedItemId (optional) — link to the reported item that led to the ban
 * - reportId     (optional) — link to the specific report that led to the ban
 *
 * Sets user.isBanned = true and creates a Ban record.
 */
export async function POST(request: Request) {
  const admin = getUserFromToken(request)
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  let body: { userId?: string; reason?: string; reportedItemId?: string; reportId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 })
  }

  const { userId, reason, reportedItemId, reportId } = body

  if (!userId || !reason) {
    return NextResponse.json(
      { message: "userId and reason are required" },
      { status: 400 }
    )
  }

  try {
  // Verify the target user exists
  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 })
  }

  // Cannot ban an admin
  if (targetUser.role === "ADMIN") {
    return NextResponse.json({ message: "Cannot ban an admin" }, { status: 400 })
  }

  // Check if there's already an active ban on this user
  const existingBan = await prisma.ban.findFirst({
    where: { userId, status: "active" },
  })
  if (existingBan) {
    return NextResponse.json(
      { message: "User is already banned", banId: existingBan.id },
      { status: 409 }
    )
  }

  // If reportedItemId provided, verify it exists
  if (reportedItemId) {
    const reportedItem = await prisma.reportedItem.findUnique({ where: { id: reportedItemId } })
    if (!reportedItem) {
      return NextResponse.json({ message: "Reported item not found" }, { status: 404 })
    }
  }

  // If reportId provided, verify it exists
  if (reportId) {
    const report = await prisma.report.findUnique({ where: { id: reportId } })
    if (!report) {
      return NextResponse.json({ message: "Report not found" }, { status: 404 })
    }
  }

  // Create the ban and set isBanned on user atomically
  const ban = await prisma.$transaction(async (tx) => {
    // Set user as banned
    await tx.user.update({
      where: { id: userId },
      data: { isBanned: true },
    })

    // Create ban record
    const newBan = await tx.ban.create({
      data: {
        userId,
        bannedByAdminId: admin.user_id,
        reason,
        status: "active",
        reportedItemId: reportedItemId ?? null,
        reportId: reportId ?? null,
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        bannedByAdmin: { select: { id: true, username: true } },
      },
    })

    return newBan
  })

  return NextResponse.json(ban, { status: 201 })
  } catch (error) {
    console.error("POST /api/admin/bans error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

/**
 * GET /api/admin/bans?status=active&page=1&limit=20
 *
 * Admin-only. Lists bans with optional status filter and pagination.
 */
export async function GET(request: Request) {
  const admin = getUserFromToken(request)
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (admin.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  try {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") // "active", "lifted", or null for all
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (status) {
    const allowedStatuses = ["active", "lifted"]
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { message: `status must be one of: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      )
    }
    where.status = status
  }

  const [bans, totalCount] = await Promise.all([
    prisma.ban.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, email: true } },
        bannedByAdmin: { select: { id: true, username: true } },
        reportedItem: { select: { id: true, contentType: true, contentId: true } },
      },
    }),
    prisma.ban.count({ where }),
  ])

  return NextResponse.json({
    data: bans,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  })
  } catch (error) {
    console.error("GET /api/admin/bans error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
