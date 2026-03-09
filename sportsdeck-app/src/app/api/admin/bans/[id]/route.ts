import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/admin/bans/{id}:
 *   get:
 *     summary: Get details of a specific ban record (admin only)
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
 *         description: Ban details with user, admin, report, and appeal info
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
 * GET /api/admin/bans/:id
 *
 * Admin-only. Returns details of a specific ban record including
 * the banned user, the admin who issued it, linked reports, and any appeals.
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

  const ban = await prisma.ban.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true, isBanned: true } },
      bannedByAdmin: { select: { id: true, username: true } },
      reportedItem: {
        select: { id: true, contentType: true, contentId: true, status: true },
      },
      report: {
        select: { id: true, reason: true, status: true },
      },
      appeals: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewedByAdmin: { select: { id: true, username: true } },
        },
      },
    },
  })

  if (!ban) {
    return NextResponse.json({ message: "Ban not found" }, { status: 404 })
  }

  return NextResponse.json(ban)
  } catch (error) {
    console.error("GET /api/admin/bans/[id] error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
