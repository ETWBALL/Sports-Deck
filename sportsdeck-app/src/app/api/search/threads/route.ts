/**
 * @openapi
 * /api/search/threads:
 *   get:
 *     summary: Search threads by text or filters
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         example: "Arsenal vs Chelsea"
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         example: "Premier League"
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         example: "clxteam123"
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
 *         description: Matching threads
 *       500:
 *         description: Internal server error
 */
// GET /api/search/threads
// Search threads by text or filters.
export async function GET(request: Request) {}
