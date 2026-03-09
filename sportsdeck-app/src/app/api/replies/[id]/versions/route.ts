/**
 * @openapi
 * /api/replies/{id}/versions:
 *   get:
 *     summary: Get edit history of a reply
 *     tags: [Replies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clx2reply456"
 *     responses:
 *       200:
 *         description: List of previous reply versions
 *       404:
 *         description: Reply not found
 */
// GET /api/replies/:id/versions
// Returns edit history of a reply.
export async function GET(request: Request, { params }: { params: { id: string } }) {}
