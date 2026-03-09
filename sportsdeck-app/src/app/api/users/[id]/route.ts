import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Param } from "@prisma/client/runtime/library"
import { withCoalescedInvoke } from "next/dist/lib/coalesced-function"
import { withAuth } from "@/lib/middleware"
import { availableMemory } from "node:process"

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Get a user's public profile including follower counts and recent activity
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxuser789"
 *     responses:
 *       200:
 *         description: User profile with follower/following counts, threads, posts, and replies
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * GET /api/users/:id
 *
 * User Story:
 * As a visitor, I want to check out a user's profile page which includes
 * their follower/following counts, favorite team, and recent activity.
 *
 * Access:
 * Public endpoint — visitors do NOT need authentication.
 *
 * Data returned:
 * - Basic user profile information (username, avatarUrl, createdAt)
 * - Favorite team information via User.favoriteTeam relation
 * - Number of followers and users the person is following
 * - Recent threads created by the user
 * - Recent posts written by the user
 * - Recent replies written by the user
 *
 * Prisma relations used:
 * - User.favoriteTeam -> Team
 * - Follow.followerId / Follow.followingId
 * - Thread.authorId
 * - Post.authorId
 * - Reply.authorId
 *
 * Important behavior:
 * - Hidden content (isHidden = true) is excluded
 * - Activity lists are limited for performance
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        favoriteTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const followersCount = await prisma.follow.count({
      where: { followingId: userId },
    })

    const followingCount = await prisma.follow.count({
      where: { followerId: userId },
    })

    const threads = await prisma.thread.findMany({
      where: {
        authorId: userId,
        isHidden: false,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    })

    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
        isHidden: false,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        threadId: true,
        content: true,
        createdAt: true,
      },
    })

    const replies = await prisma.reply.findMany({
      where: {
        authorId: userId,
        isHidden: false,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        postId: true,
        content: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      user,
      followersCount,
      followingCount,
      threads,
      posts,
      replies,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


// Endpoint for users to change their fields: username, avatar, favorite team
async function updateUser(req: NextRequest, { params }: { params: { id: string }}): Promise<NextResponse>{
  const {id} = params;
  const {new_username, new_avatar, new_favorite_team} = await req.json();

  // Check the fields
  if (!new_username && !new_avatar && !new_favorite_team){
    return NextResponse.json({message: "No username, avatar, or team provided"}, {status: 400});
  }

  // Find corresponding user
  const user = await prisma.user.findUnique({where: {id: id}});
  
  // In case the client provides a user that does not exist
  if (!user){
    return NextResponse.json({message: "No such user exists"}, {status: 404});
  }

  let team;
  // Look for the team and return an error if no such team is found
  if (new_favorite_team){
      team = await prisma.team.findUnique({
      where: {name: new_favorite_team}
    })
    if (!team){
      return NextResponse.json({message: "No such team exists"}, {status: 404});
    }
  }
  

  // Make one call and update the database
  await prisma.user.update({
    where: {id: id},
    data: {
      ...(new_username && {username: new_username}),   // This will put the username if provided or do nothing 
      ...(new_avatar && {avatarUrl: new_avatar}),
      ...(team && {favoriteTeam: team})
    }
  })
  
  return NextResponse.json({message: `Updated username to ${new_username}, avatar to ${new_avatar}, and favorite_team to ${new_favorite_team}`}, {status: 200});

}

// Can only update user information if authenticated 
export const PATCH = withAuth(updateUser)
