/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get the authenticated user's own profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user's profile
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "john_doe_updated"
 *               avatarUrl:
 *                 type: string
 *                 example: "https://example.com/avatar.png"
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Invalid fields
 *       401:
 *         description: Unauthorized
 */// Returns the currently authenticated user’s profile. 
export async function GET(request: Request) {}

// Allow authenticated user to update their own profile (username, avatar, etc.)
export async function PATCH(request: Request) {}
