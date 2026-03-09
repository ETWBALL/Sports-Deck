import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/polls/{id}/vote:
 *   post:
 *     summary: Cast a vote on a poll option
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
 *             required: [optionId]
 *             properties:
 *               optionId:
 *                 type: string
 *                 example: "clxopt001"
 *     responses:
 *       201:
 *         description: Vote recorded
 *       400:
 *         description: Poll closed, invalid option, or user already voted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account banned or thread hidden
 *       404:
 *         description: Poll not found
 *       500:
 *         description: Internal server error
 */

/**
 * POST /api/polls/:id/vote
 *
 * Cast vote for an option.
 *
 * Body:
 * {
 *   optionId: string
 * }
 *
 * Enforces:
 * - one vote per user per poll
 * - poll not closed
 */

export async function POST(
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
      include: { options: true }
    })

    if (!poll)
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })

    if (poll.isClosed || new Date() > poll.deadline)
      return NextResponse.json({ error: "Poll closed" }, { status: 400 })

    // Block voting on polls in hidden threads
    const thread = await prisma.thread.findUnique({ where: { id: poll.threadId } })
    if (thread?.isHidden)
      return NextResponse.json({ error: "This thread has been hidden by a moderator and no further activity is allowed" }, { status: 403 })

    const body = await request.json()
    const { optionId } = body

    const option = await prisma.pollOption.findUnique({
      where: { id: optionId }
    })

    if (!option || option.pollId !== poll.id)
      return NextResponse.json({ error: "Invalid option" }, { status: 400 })


    const existingVote = await prisma.vote.findFirst({
      where: {
        userId: user.id,
        pollOption: {
          pollId: poll.id
        }
      }
    })

    if (existingVote)
      return NextResponse.json(
        { error: "User already voted in this poll" },
        { status: 400 }
      )


    const vote = await prisma.vote.create({
      data: {
        userId: user.id,
        pollOptionId: optionId
      }
    })

    return NextResponse.json(vote, { status: 201 })

  } catch (err) {

    console.error(err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }

}