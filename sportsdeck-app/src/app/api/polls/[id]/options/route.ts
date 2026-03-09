import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/polls/{id}/options:
 *   post:
 *     summary: Add options to an existing poll
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
 *             required: [options]
 *             properties:
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Arsenal", "Chelsea"]
 *     responses:
 *       201:
 *         description: Options added to poll
 *       400:
 *         description: Options array required
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
 * POST /api/polls/:id/options
 *
 * Adds options to an existing poll.
 * Only thread owner or admin can add options.
 *
 * Body:
 * {
 *   options: ["Team A", "Team B"]
 * }
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
      include: { thread: true }
    })

    if (!poll)
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })

    if (poll.thread.authorId !== user.id && user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { options } = body

    if (!options || !Array.isArray(options))
      return NextResponse.json({ error: "Options required" }, { status: 400 })

    const created = []

    for (const optionText of options) {

      const option = await prisma.pollOption.create({
        data: {
          pollId: poll.id,
          optionText
        }
      })

      created.push(option)
    }

    return NextResponse.json(created, { status: 201 })

  } catch (err) {

    console.error(err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }

}