import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"

/**
 * @openapi
 * /api/threads/{id}/posts:
 *   get:
 *     summary: Get all visible posts in a thread
 *     tags: [Threads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxthread001"
 *     responses:
 *       200:
 *         description: List of posts
 *       404:
 *         description: Thread not found or hidden
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Post a comment inside a thread
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "I think Arsenal will win this one!"
 *     responses:
 *       201:
 *         description: Post created
 *       400:
 *         description: Content is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account banned or thread locked
 *       404:
 *         description: Thread not found
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/threads/:threadId/posts
 *
 * Visitors can view posts inside the thread.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params

    const thread = await prisma.thread.findUnique({
      where: { id: threadId }
    })

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      )
    }

    // Hide posts from hidden threads
    if (thread.isHidden) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      )
    }

    const posts = await prisma.post.findMany({
      where: {
        threadId: thread.id,
        isHidden: false
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json(posts)

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


/**
 * POST /api/threads/:threadId/posts
 *
 * User Story:
 * Users can post comments inside match discussion threads.
 *
 * Rules:
 * - Must be authenticated
 * - Thread must be open
 * - Thread must not be locked
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params

    const user = await getUserFromToken(req)

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Live ban check from DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id }, select: { isBanned: true } })
    if (dbUser?.isBanned) {
      return NextResponse.json({ error: "Your account has been banned" }, { status: 403 })
    }

    let body: { content?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { content } = body

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId }
    })

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      )
    }

    // Block posting in hidden threads
    if (thread.isHidden) {
      return NextResponse.json(
        { error: "This thread has been hidden by a moderator and no further activity is allowed" },
        { status: 403 }
      )
    }

    const now = new Date()

    // enforce open window
    if (thread.opensAt && now < thread.opensAt) {
      return NextResponse.json(
        { error: "Thread has not opened yet" },
        { status: 403 }
      )
    }

    if (thread.lockedAt && now > thread.lockedAt) {
      return NextResponse.json(
        { error: "Thread is closed" },
        { status: 403 }
      )
    }

    if (thread.isLocked) {
      return NextResponse.json(
        { error: "Thread is locked" },
        { status: 403 }
      )
    }

    const post = await prisma.post.create({
      data: {
        threadId: thread.id,
        authorId: user.user_id,
        content: content.trim()
      }
    })

    return NextResponse.json(post, { status: 201 })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}