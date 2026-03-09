import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"
import { moderateContent } from "@/lib/moderation"

/**
 * @openapi
 * /api/posts/{id}/replies:
 *   post:
 *     summary: Create a reply under a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clx1abc123"
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
 *                 example: "This is my reply to the post."
 *     responses:
 *       201:
 *         description: Reply created successfully
 *       400:
 *         description: Content is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account banned or thread locked/closed
 *       404:
 *         description: Post or thread not found
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get all visible replies under a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clx1abc123"
 *     responses:
 *       200:
 *         description: List of replies
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
// POST /api/posts/:id/replies
// Creates a comment (reply) under a post.
// Auto-flags the reply content through AI moderation on creation.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params

    const user = await getUserFromToken(request)
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Live ban check
    const dbUser = await prisma.user.findUnique({
      where: { id: user.user_id },
      select: { isBanned: true },
    })
    if (dbUser?.isBanned)
      return NextResponse.json({ error: "Your account has been banned" }, { status: 403 })

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { thread: true },
    })

    if (!post || post.isHidden)
      return NextResponse.json({ error: "Post not found" }, { status: 404 })

    const thread = post.thread

    if (thread.isHidden)
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })

    if (thread.isLocked)
      return NextResponse.json({ error: "Thread is locked" }, { status: 403 })

    const now = new Date()
    if (thread.lockedAt && now > thread.lockedAt)
      return NextResponse.json({ error: "Thread is closed" }, { status: 403 })

    let body: { content?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { content } = body

    if (!content || content.trim() === "")
      return NextResponse.json({ error: "Content is required" }, { status: 400 })

    const reply = await prisma.reply.create({
      data: {
        postId: post.id,
        authorId: user.user_id,
        content: content.trim(),
      },
    })

    // Fire-and-forget AI auto-flag for comments
    moderateContent("REPLY", reply.id, content.trim()).catch((err) =>
      console.error("[replies] moderateContent failed:", err)
    )

    return NextResponse.json(reply, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/posts/:id/replies
// Returns all visible replies under a post.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post || post.isHidden)
      return NextResponse.json({ error: "Post not found" }, { status: 404 })

    const replies = await prisma.reply.findMany({
      where: { postId, isHidden: false },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(replies)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}