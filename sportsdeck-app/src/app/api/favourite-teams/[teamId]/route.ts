/**
 * @openapi
 * /api/favourite-teams/{teamId}:
 *   delete:
 *     summary: Remove a favourite team
 *     tags: [FavouriteTeams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxteam123"
 *     responses:
 *       200:
 *         description: Favourite team removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Team not found
 */
// Remove favourite team
export async function DELETE() {}