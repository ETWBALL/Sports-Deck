import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/auth"
import { Prisma } from "@/generated/prisma"

/**
 * @openapi
 * /api/threads:
 *   post:
 *     summary: Create a new discussion thread
 *     tags: [Threads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Premier League Match Day Discussion"
 *               content:
 *                 type: string
 *                 example: "What are your thoughts on today's match?"
 *               teamId:
 *                 type: string
 *                 example: "clxteam123"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Premier League", "Arsenal"]
 *     responses:
 *       201:
 *         description: Thread created successfully
 *       400:
 *         description: Title and content required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account banned
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get paginated list of threads with optional filters
 *     tags: [Threads]
 *     parameters:
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         example: "clxteam123"
 *       - in: query
 *         name: matchId
 *         schema:
 *           type: string
 *         example: "clxmatch456"
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         example: "Arsenal"
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *         example: "clxuser789"
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         example: "john_doe"
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         example: "match day"
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, top]
 *         example: "recent"
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
 *         description: Paginated list of threads
 *       500:
 *         description: Internal server error
 */

/**
 * POST /api/threads
 *
 * Creates a new discussion thread.
 *
 * User provides:
 * - title
 * - content (first post)
 * - optional teamId
 * - optional tags
 *
 * Creates:
 * - THREAD
 * - initial POST
 * - TAG relations
 */

export async function POST(request: Request) {

  try {

    const user = await getUserFromToken(request)

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

    let body: { title?: string; content?: string; teamId?: string; tags?: string[] }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const {
      title,
      content,
      teamId,
      tags
    } = body


    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content required" },
        { status: 400 }
      )
    }


    const thread = await prisma.thread.create({
      data: {
        title,
        authorId: user.user_id,
        teamId: teamId ?? null,
        isMatchThread: false,
        isLocked: false,
        isHidden: false
      }
    })


    // create first post
    await prisma.post.create({
      data: {
        threadId: thread.id,
        authorId: user.user_id,
        content
      }
    })


    // handle tags
    if (tags && Array.isArray(tags)) {

      for (const tagName of tags) {

        let tag = await prisma.tag.findUnique({
          where: { name: tagName }
        })

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagName
            }
          })
        }

        await prisma.threadTag.create({
          data: {
            threadId: thread.id,
            tagId: tag.id
          }
        })
      }

    }


    return NextResponse.json(thread, { status: 201 })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )

  }

}



/**
 * GET /api/threads
 *
 * Returns paginated list of threads.
 *
 * Supports filters:
 * - teamId
 * - matchId
 * - tag
 * - authorId
 * - q (search text)
 * - sort (recent | top)
 */

export async function GET(request: Request) {

  try {

    const { searchParams } = new URL(request.url)

    const teamId = searchParams.get("teamId")
    const matchId = searchParams.get("matchId")
    const tag = searchParams.get("tag")
    const authorId = searchParams.get("authorId")
    const author = searchParams.get("author")
    const q = searchParams.get("q")
    const sort = searchParams.get("sort") ?? "recent"

    const page = Number(searchParams.get("page") ?? 1)
    const limit = Number(searchParams.get("limit") ?? 20)

    const skip = (page - 1) * limit


    const where: Record<string, unknown> = {
      isHidden: false
    }

    if (teamId) where.teamId = teamId
    if (matchId) where.matchId = matchId
    if (authorId) where.authorId = authorId

    if (author) {
      where.author = {
        username: {
          contains: author,
          mode: "insensitive"
        }
      }
    }

    if (q) {
      where.title = {
        contains: q,
        mode: "insensitive"
      }
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            name: tag
          }
        }
      }
    }


    let orderBy:  Record<string, unknown> = {
      createdAt: "desc"
    }

    if (sort === "top") {
      orderBy = {
        posts: {
          _count: "desc"
        }
      }
    }


    const threads = await prisma.thread.findMany({

      where,

      orderBy,

      skip,
      take: limit,

      include: {

        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },

        tags: {
          include: {
            tag: true
          }
        },

        _count: {
          select: {
            posts: true
          }
        }

      }

    })


    return NextResponse.json(threads)

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )

  }

}