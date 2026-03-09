import { verifyAccessToken } from "./auth"
import { NextResponse, NextRequest } from "next/server"
import { JwtPayload } from "jsonwebtoken"

// Extend NextRequest to carry the authenticated user payload
export interface AuthenticatedRequest extends NextRequest {
  user: JwtPayload
}

// Wraps a route handler with JWT authentication and optional role-based access control
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>,
  role?: string
) {
  return (req: NextRequest) => {
    // Reject if Authorization header is missing
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Extract and verify the access token
    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)

    // Reject if token is invalid, expired, or not an object
    if (!payload || typeof payload === 'string') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Reject if user is banned
    if (payload.isBanned) {
      return NextResponse.json({ message: 'Your account has been banned' }, { status: 403 })
    }

    // Reject if the route requires a role the user does not have
    if (role && payload.role !== role) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Attach the verified payload to the request and proceed
    const authedReq = req as AuthenticatedRequest
    authedReq.user = payload
    return handler(authedReq)
  }
}