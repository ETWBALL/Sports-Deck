import { comparePassword, generateAccessToken, generateRefreshToken, hashPassword } from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "securePassword123"
 *     responses:
 *       200:
 *         description: Login successful, returns access and refresh tokens
 *       400:
 *         description: Missing fields or invalid request body
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request){
    let body: { email?: string; password?: string; [key: string]: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ message: "Invalid request" }, { status: 400 })
    }
    const extraFields = Object.keys(body).filter(key => !['email', 'password'].includes(key));

    if (extraFields.length > 0) {
        return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }    

    const {email, password} = body;
    if (!email || !password) {
        return NextResponse.json({ message: "Please provide an email and password" }, { status: 400 });
    }

    try{
        // Try to find the user. 
        const user = await prisma.user.findUnique({
            where: { email: email}
        });

        // If they do not exist or password is wrong, return invalid username or password error.
        if (!user || !(await comparePassword(password, user.passwordHash ?? ""))){
            return NextResponse.json({message: "Invalid username or password"}, {status: 401});
        }
        
        // Otherwise, they are authenticated. Return a JWT token to them
        const payload = {username: user.username, user_id: user.id, role: user.role, isBanned: user.isBanned};
        const access_token = generateAccessToken(payload);

        // Give them a new refresh token since they are putting in their credentials for the first time
        const refresh_token = generateRefreshToken(payload);
        await prisma.user.update({
            where: {email: user.email}, 
            data: {refresh_token: await hashPassword(refresh_token)}
        })


        return NextResponse.json({access_token: access_token, refresh_token: refresh_token}, {status: 200});
    }
    catch(error){
        console.log(error)
        return NextResponse.json({message: "Something went wrong"}, {status: 500});
    }
    
}