/**
 * @openapi
 * /api/admin/replies/{id}/hide:
 *   patch:
 *     summary: Hide a reply (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxreply001"
 *     responses:
 *       200:
 *         description: Reply hidden
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reply not found
 */
// PATCH /api/admin/replies/:id/hide
// Soft-hides reply.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {}
