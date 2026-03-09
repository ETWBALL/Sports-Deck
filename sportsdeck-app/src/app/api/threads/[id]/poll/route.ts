import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/threads/{id}/poll:
 *   post:
 *     summary: Create a poll attached to a thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxthread001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question, deadline]
 *             properties:
 *               question:
 *                 type: string
 *                 example: "Who will win the match?"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-04-01T20:00:00.000Z"
 *     responses:
 *       201:
 *         description: Poll created
 *       400:
 *         description: Question and deadline required or thread already has a poll
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Internal server error
 */

/**
 * POST /api/threads/:id/poll
 *
 * Creates a poll attached to a thread.
 *
 * Request body:
 * {
 *   question: string
 *   deadline: string (ISO date)
 * }
 *
 * Rules:
 * - must be authenticated
 * - thread must exist
 * - thread cannot already have a poll
 * - only thread owner or admin can create poll
 */

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {

  try {

    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const thread = await prisma.thread.findUnique({
      where: { id: params.id },
      include: { polls: true }
    })

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      )
    }

    if (thread.polls.length > 0) {
      return NextResponse.json(
        { error: "Thread already has a poll" },
        { status: 400 }
      )
    }

    if (thread.authorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await request.json()

    const { question, deadline } = body

    if (!question || !deadline) {
      return NextResponse.json(
        { error: "Question and deadline required" },
        { status: 400 }
      )
    }

    const poll = await prisma.poll.create({
      data: {
        threadId: thread.id,
        question,
        deadline: new Date(deadline),
        isClosed: false
      }
    })

    return NextResponse.json(poll, { status: 201 })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )

  }

}