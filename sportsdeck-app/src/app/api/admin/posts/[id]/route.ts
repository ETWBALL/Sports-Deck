/**
 * @openapi
 * /api/admin/posts/{id}:
 *   get:
 *     summary: Get a post record for administration (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxpost001"
 *     responses:
 *       200:
 *         description: Post details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
// Operations on a specific post record (lookup, etc.).
export async function GET(request: Request, { params }: { params: { id: string } }) {}
