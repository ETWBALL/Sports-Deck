import {prisma} from '@/lib/prisma';
import {Prisma} from '@/generated/prisma';
import { hashPassword, generateAccessToken, generateRefreshToken} from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user account
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
 *                 example: "newuser@example.com"
 *               password:
 *                 type: string
 *                 example: "securePassword123"
 *     responses:
 *       201:
 *         description: Account created, returns access and refresh tokens
 *       400:
 *         description: Missing fields or invalid request body
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request){

    // Get usernames, emails, password. 
    const body = await req.json();

    const extraFields = Object.keys(body).filter(key => !['email', 'password'].includes(key));
    if (extraFields.length > 0) {
        return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const {email, password} = body;

    if (!email){
        return NextResponse.json({message: "Please provide an email"}, {status: 400});
    }
    if (!password){
        return NextResponse.json({message: "Please provide a password"}, {status: 400});
    }
    
    // Try to create a new user instance. If created, just return user without password
    try {
        const email_exists = await prisma.user.findUnique({where: {email:email}})

        if (email_exists){
            return NextResponse.json({message: `Email already in use`}, {status: 409 })    
        }

        const user = await prisma.user.create({
            data: {
                passwordHash: await hashPassword(password),
                email: email
            }
        });  

        // Return a JWT token. They are logged in
        const payload = {username: user.username, user_id: user.id, role: user.role};
        const access_token = generateAccessToken(payload);
        const refresh_token = generateRefreshToken(payload)

        // Store refresh token in database
        await prisma.user.update({
            where: { id: user.id},
            data: {refresh_token: await hashPassword(refresh_token)}
        })
    
        return NextResponse.json({access_token: access_token, refresh_token: refresh_token}, {status: 201});

    }

    catch (error){
        console.error("SIGNUP ERROR:", error);
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
    
}