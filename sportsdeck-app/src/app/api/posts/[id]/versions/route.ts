/**
 * @openapi
 * /api/posts/{id}/versions:
 *   get:
 *     summary: Get edit history of a post
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
 *         description: List of previous versions
 *       404:
 *         description: Post not found
 */
// GET /api/posts/:id/versions
// Returns version history of a post.
// Used to view edit history.
export async function GET(request: Request, { params }: { params: { id: string } }) {}