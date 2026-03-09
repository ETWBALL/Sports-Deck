import { NextResponse } from "next/dist/server/web/spec-extension/response"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"
import { moderateContent } from "@/lib/moderation"

/**
 * @openapi
 * /api/replies/{id}:
 *   patch:
 *     summary: Edit a reply's content (owner only)
 *     tags: [Replies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clx2reply456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Updated reply content."
 *     responses:
 *       200:
 *         description: Reply updated successfully
 *       400:
 *         description: Content is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or account banned or content hidden
 *       404:
 *         description: Reply not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Soft-delete a reply (owner or admin)
 *     tags: [Replies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clx2reply456"
 *     responses:
 *       200:
 *         description: Reply deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reply not found
 */
// PATCH /api/replies/:id
// Allows reply owner to edit.
// Creates ReplyVersion record.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  try {

    const user = await getUserFromToken(request)

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Live ban check from DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id }, select: { isBanned: true } })
    if (dbUser?.isBanned)
      return NextResponse.json({ error: "Your account has been banned" }, { status: 403 })

    const { id: replyId } = await params

    const reply = await prisma.reply.findUnique({
      where: { id: replyId }
    })

    if (!reply)
      return NextResponse.json({ error: "Reply not found" }, { status: 404 })

    if (reply.authorId !== user.user_id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Block edits on hidden content
    if (reply.isHidden)
      return NextResponse.json({ error: "This content has been hidden by a moderator and cannot be edited" }, { status: 403 })

    const body = await request.json()
    const { content } = body

    if (!content)
      return NextResponse.json({ error: "Content required" }, { status: 400 })


    /**
     * Save old version
     */
    await prisma.replyVersion.create({
      data: {
        replyId: reply.id,
        oldContent: reply.content
      }
    })


    /**
     * Update reply
     */
    const updated = await prisma.reply.update({
      where: { id: reply.id },
      data: {
        content,
        isEdited: true,
        updatedAt: new Date()
      }
    })

    // Fire-and-forget AI moderation on edited content
    moderateContent("REPLY", reply.id, content).catch((err) =>
      console.error("[replies/edit] moderateContent failed:", err)
    )

    return NextResponse.json(updated)

  } catch (err) {

    console.error(err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )

  }

}

// DELETE /api/replies/:id
// Soft-hides reply.
// Owner or admin only.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {}
