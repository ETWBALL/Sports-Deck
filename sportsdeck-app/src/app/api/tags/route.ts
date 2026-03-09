/**
 * @openapi
 * /api/tags:
 *   post:
 *     summary: Create a new tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Arsenal"
 *     responses:
 *       201:
 *         description: Tag created
 *       409:
 *         description: Tag already exists
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get list of all tags
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: List of tags
 *       500:
 *         description: Internal server error
 */
// POST /api/tags
// Creates new tag (if not exists).
// Optional if auto-created during thread creation.
export async function POST(request: Request) {}

// GET /api/tags
// Returns list of all tags.
export async function GET(request: Request) {}
