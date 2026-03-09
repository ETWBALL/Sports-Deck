/**
 * @openapi
 * /api/admin/posts/{id}/hide:
 *   patch:
 *     summary: Hide a post (admin only)
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
 *         description: Post hidden
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
// PATCH /api/admin/posts/:id/hide
// Soft-hides post.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {}
