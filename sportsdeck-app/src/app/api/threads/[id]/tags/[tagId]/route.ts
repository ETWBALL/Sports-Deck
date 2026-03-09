/**
 * @openapi
 * /api/threads/{id}/tags/{tagId}:
 *   delete:
 *     summary: Remove a tag from a thread
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
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxtag789"
 *     responses:
 *       200:
 *         description: Tag removed from thread
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Thread or tag not found
 */
// DELETE /api/threads/:id/tags/:tagId
// Removes tag from thread.
export async function DELETE(request: Request, { params }: { params: { id: string; tagId: string } }) {}
