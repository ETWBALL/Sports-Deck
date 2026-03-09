/**
 * @openapi
 * /api/admin/threads/{id}/hide:
 *   patch:
 *     summary: Hide a thread (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxthread001"
 *     responses:
 *       200:
 *         description: Thread hidden
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Thread not found
 */
// PATCH /api/admin/threads/:id/hide
// Soft-hides thread.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {}
