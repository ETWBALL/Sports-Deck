/**
 * @openapi
 * /api/admin/reports/{id}/approve:
 *   patch:
 *     summary: Approve a report — hides content and optionally bans the user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "clxreporteditem001"
 *     responses:
 *       200:
 *         description: Report approved and status set to APPROVED
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reported item not found
 */
// PATCH /api/admin/reports/:id/approve
// Admin approves report.
// Typically hides content, optionally bans user.
// Sets status to APPROVED.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {}
