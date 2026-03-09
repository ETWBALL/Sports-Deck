/**
 * @openapi
 * /api/threads/{id}/tags:
 *   post:
 *     summary: Attach tags to a thread
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
 *             required: [tags]
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Arsenal", "Derby"]
 *     responses:
 *       200:
 *         description: Tags attached
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Thread not found
 */
// POST /api/threads/:id/tags
// Attaches tag(s) to thread.
export async function POST(request: Request, { params }: { params: { id: string } }) {}
