import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/polls/{id}:
 *   get:
 *     summary: Get poll details including question, options, and deadline
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxpoll001"
 *     responses:
 *       200:
 *         description: Poll details
 *       404:
 *         description: Poll not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Edit poll question or deadline (thread owner or admin)
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxpoll001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 example: "Who will score first?"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-04-15T18:00:00.000Z"
 *     responses:
 *       200:
 *         description: Poll updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or account banned
 *       404:
 *         description: Poll not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a poll (thread owner or admin)
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxpoll001"
 *     responses:
 *       200:
 *         description: Poll deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or account banned
 *       404:
 *         description: Poll not found
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/polls/:id
 *
 * Returns poll details including:
 * - question
 * - options
 * - deadline
 * - isClosed
 *
 * Accessible by visitors.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {

  try {

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        options: true
      }
    })

    if (!poll)
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })

    return NextResponse.json(poll)

  } catch (err) {

    console.error(err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }

}

/**
 * PATCH /api/polls/:id
 *
 * Allows the thread author or an admin to edit poll properties.
 *
 * Editable fields:
 * - question
 * - deadline
 *
 * The endpoint verifies that the requesting user is either
 * the thread author or an admin before allowing the update.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {

  try {

    const user = await getUserFromToken(request)

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Live ban check from DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id }, select: { isBanned: true } })
    if (dbUser?.isBanned)
      return NextResponse.json({ error: "Your account has been banned" }, { status: 403 })

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: { thread: true }
    })

    if (!poll)
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })

    if (poll.thread.authorId !== user.id && user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Block edits on polls in hidden threads
    if (poll.thread.isHidden)
      return NextResponse.json({ error: "This thread has been hidden by a moderator and cannot be edited" }, { status: 403 })

    const body = await request.json()

    const updated = await prisma.poll.update({
      where: { id: poll.id },
      data: {
        question: body.question ?? poll.question,
        deadline: body.deadline ? new Date(body.deadline) : poll.deadline
      }
    })

    return NextResponse.json(updated)

  } catch (err) {

    console.error(err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )

  }

}

/**
 * DELETE /api/polls/:id
 *
 * Deletes a poll.
 *
 * Only the thread author or an admin can delete the poll.
 *
 * The poll is removed from the database. Any associated
 * options and votes will also be removed if cascading
 * deletes are configured in the Prisma schema.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {

  try {

    const user = await getUserFromToken(request)

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Live ban check from DB
    const dbUser2 = await prisma.user.findUnique({ where: { id: user.user_id }, select: { isBanned: true } })
    if (dbUser2?.isBanned)
      return NextResponse.json({ error: "Your account has been banned" }, { status: 403 })

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: { thread: true }
    })

    if (!poll)
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })

    if (poll.thread.authorId !== user.id && user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })


    await prisma.poll.delete({
      where: { id: poll.id }
    })


    return NextResponse.json({
      success: true
    })

  } catch (err) {

    console.error(err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )

  }

}