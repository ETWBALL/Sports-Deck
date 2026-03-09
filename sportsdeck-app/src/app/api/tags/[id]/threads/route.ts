/**
 * @openapi
 * /api/tags/{id}/threads:
 *   get:
 *     summary: Get threads associated with a tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxtag789"
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
 *         description: List of threads with this tag
 *       404:
 *         description: Tag not found
 */
// GET /api/tags/:id/threads
// Returns threads associated with that tag.
export async function GET(request: Request, { params }: { params: { id: string } }) {}
