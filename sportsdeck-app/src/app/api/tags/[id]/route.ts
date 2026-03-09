/**
 * @openapi
 * /api/tags/{id}:
 *   get:
 *     summary: Get tag details
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxtag789"
 *     responses:
 *       200:
 *         description: Tag details
 *       404:
 *         description: Tag not found
 */
// GET /api/tags/:id
// Returns tag details.
export async function GET(request: Request, { params }: { params: { id: string } }) {}
