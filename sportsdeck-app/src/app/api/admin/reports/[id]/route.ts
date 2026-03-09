import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"
import { analyzeContent } from "@/lib/moderation"

/**
 * @openapi
 * /api/admin/reports/{id}:
 *   get:
 *     summary: Get full detail of a reported item including AI verdict (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxreporteditem001"
 *     responses:
 *       200:
 *         description: Reported item with all reports, admin actions, content preview, and AI verdict
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reported item not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Dismiss or approve a reported item (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxreporteditem001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [dismiss, approve]
 *                 example: "approve"
 *     responses:
 *       200:
 *         description: Report dismissed or approved; content hidden if approved
 *       400:
 *         description: Invalid action, invalid JSON, or report already resolved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reported item not found
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/admin/reports/:id
 *
 * Admin-only. Returns the full detail of a reported item including
 * all individual reports, admin actions, a preview of the content,
 * and the AI-generated verdict (toxicity score, labels, explanation).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  if (user.isBanned) {
    return NextResponse.json({ message: "Your account has been banned" }, { status: 403 })
  }

  try {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ message: "Report ID is required" }, { status: 400 })
  }

  const reportedItem = await prisma.reportedItem.findUnique({
    where: { id },
    include: {
      reports: {
        include: {
          reporter: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      adminActions: {
        include: {
          admin: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!reportedItem) {
    return NextResponse.json(
      { message: "Reported item not found" },
      { status: 404 }
    )
  }

  // Fetch a preview of the actual content being reported
  const contentPreview = await getContentPreview(
    reportedItem.contentType,
    reportedItem.contentId
  )

  // Build a structured AI verdict summary for the admin
  const aiVerdict = reportedItem.aiScore != null
    ? {
        score: reportedItem.aiScore,
        label: reportedItem.aiLabel,
        explanation: reportedItem.aiExplanation,
        model: reportedItem.aiModel,
        analyzedAt: reportedItem.aiUpdatedAt,
        recommendation:
          reportedItem.aiScore >= 0.7
            ? "LIKELY_INAPPROPRIATE"
            : reportedItem.aiScore >= 0.4
              ? "NEEDS_REVIEW"
              : "LIKELY_SAFE",
      }
    : null

  return NextResponse.json({
    ...reportedItem,
    contentPreview,
    aiVerdict,
  })
  } catch (error) {
    console.error("GET /api/admin/reports/[id] error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/reports/:id
 *
 * Admin-only. Dismiss or approve a reported item.
 *
 * Body: { action: "dismiss" | "approve" }
 *
 * - dismiss: Marks the reported item and all its reports as dismissed.
 *            No change to the underlying content.
 *
 * - approve: Marks the reported item and all its reports as approved.
 *            Hides the original content (thread/post/reply) by setting isHidden = true.
 *            Creates an AdminAction audit record.
 *            No further activity (reply, vote, edit) is allowed on that content.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  if (user.isBanned) {
    return NextResponse.json({ message: "Your account has been banned" }, { status: 403 })
  }

  try {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ message: "Report ID is required" }, { status: 400 })
  }

  const adminId = user.user_id

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 })
  }

  const { action } = body

  if (!action || !["dismiss", "approve"].includes(action)) {
    return NextResponse.json(
      { message: 'action must be "dismiss" or "approve"' },
      { status: 400 }
    )
  }

  // Find the reported item
  const reportedItem = await prisma.reportedItem.findUnique({
    where: { id },
    include: { reports: true },
  })

  if (!reportedItem) {
    return NextResponse.json(
      { message: "Reported item not found" },
      { status: 404 }
    )
  }

  // Prevent acting on already resolved items
  if (reportedItem.status !== "pending") {
    return NextResponse.json(
      { message: `This item has already been ${reportedItem.status}` },
      { status: 400 }
    )
  }

  if (action === "dismiss") {
    // ── DISMISS ──
    await prisma.$transaction([
      prisma.reportedItem.update({
        where: { id },
        data: { status: "dismissed" },
      }),
      prisma.report.updateMany({
        where: { reportedItemId: id },
        data: { status: "dismissed" },
      }),
      prisma.adminAction.create({
        data: {
          adminId,
          reportedItemId: id,
          actionType: "dismiss",
          notes: "Report dismissed by admin",
        },
      }),
    ])

    return NextResponse.json({
      message: "Report dismissed successfully",
      reportedItemId: id,
      status: "dismissed",
    })
  }

  // ── APPROVE (HIDE CONTENT) ──
  await prisma.$transaction(async (tx) => {
    await tx.reportedItem.update({
      where: { id },
      data: { status: "approved" },
    })
    await tx.report.updateMany({
      where: { reportedItemId: id },
      data: { status: "approved" },
    })
    await hideContent(tx, reportedItem.contentType, reportedItem.contentId)
    await tx.adminAction.create({
      data: {
        adminId,
        reportedItemId: id,
        actionType: "approve_hide",
        notes: `Content hidden: ${reportedItem.contentType} ${reportedItem.contentId}`,
      },
    })
  })

  return NextResponse.json({
    message: "Report approved — content has been hidden",
    reportedItemId: id,
    contentType: reportedItem.contentType,
    contentId: reportedItem.contentId,
    status: "approved",
  })
  } catch (error) {
    console.error("PATCH /api/admin/reports/[id] error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Hides content by setting isHidden = true on the appropriate model.
 * For threads, also hides all child posts and replies.
 * For posts, also hides all child replies.
 */
async function hideContent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  contentType: string,
  contentId: string
) {
  switch (contentType) {
    case "THREAD": {
      // Hide the thread itself
      await tx.thread.update({
        where: { id: contentId },
        data: { isHidden: true },
      })
      // Also hide all posts in this thread
      const posts = await tx.post.findMany({
        where: { threadId: contentId },
        select: { id: true },
      })
      if (posts.length > 0) {
        await tx.post.updateMany({
          where: { threadId: contentId },
          data: { isHidden: true },
        })
        // Hide all replies under those posts
        await tx.reply.updateMany({
          where: { postId: { in: posts.map((p) => p.id) } },
          data: { isHidden: true },
        })
      }
      break
    }
    case "POST": {
      // Hide the post
      await tx.post.update({
        where: { id: contentId },
        data: { isHidden: true },
      })
      // Also hide all replies under this post
      await tx.reply.updateMany({
        where: { postId: contentId },
        data: { isHidden: true },
      })
      break
    }
    case "REPLY": {
      // Hide the reply
      await tx.reply.update({
        where: { id: contentId },
        data: { isHidden: true },
      })
      break
    }
  }
}

/**
 * Fetches a preview of the reported content for admin review.
 */
async function getContentPreview(contentType: string, contentId: string) {
  switch (contentType) {
    case "THREAD": {
      const thread = await prisma.thread.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          title: true,
          isHidden: true,
          createdAt: true,
          author: { select: { id: true, username: true } },
        },
      })
      return thread
    }
    case "POST": {
      const post = await prisma.post.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          content: true,
          isHidden: true,
          createdAt: true,
          author: { select: { id: true, username: true } },
          thread: { select: { id: true, title: true } },
        },
      })
      return post
    }
    case "REPLY": {
      const reply = await prisma.reply.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          content: true,
          isHidden: true,
          createdAt: true,
          author: { select: { id: true, username: true } },
          post: {
            select: {
              id: true,
              thread: { select: { id: true, title: true } },
            },
          },
        },
      })
      return reply
    }
    default:
      return null
  }
}
