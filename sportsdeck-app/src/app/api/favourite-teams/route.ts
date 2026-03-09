/**
 * @openapi
 * /api/favourite-teams:
 *   post:
 *     summary: Set the authenticated user's favourite team
 *     tags: [FavouriteTeams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teamId]
 *             properties:
 *               teamId:
 *                 type: string
 *                 example: "clxteam123"
 *     responses:
 *       200:
 *         description: Favourite team set
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Team not found
 */
// Add favourite team
export async function POST() {}