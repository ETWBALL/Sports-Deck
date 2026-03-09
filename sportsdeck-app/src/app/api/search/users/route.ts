/**
 * @openapi
 * /api/search/users:
 *   get:
 *     summary: Search for users by username
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         example: "john_doe"
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
 *         description: Matching users
 *       500:
 *         description: Internal server error
 */
// GET /api/search/users
// Search for users by username or other criteria.
export async function GET(request: Request) {}
