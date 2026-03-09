import bcrypt from 'bcryptjs'
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10')
if (isNaN(SALT_ROUNDS)) throw new Error('SALT_ROUNDS must be a number');
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const JWT_ACCESS_EXPIRATION = (process.env.JWT_ACCESS_EXPIRATION || '1h') as SignOptions['expiresIn']
const JWT_REFRESH_EXPIRATION = (process.env.JWT_REFRESH_EXPIRATION || '30d') as SignOptions['expiresIn']

// Fail fast if JWT secrets are not set in the environment
if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets are not defined in environment variables')
}

// Hashes a plain-text password using bcrypt before storing it in the database
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Compares a plain-text candidate password against a stored bcrypt hash
export async function comparePassword(candidate: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(candidate, hashed)
}

// Signs a short-lived access token used to authenticate API requests
export function generateAccessToken(payload: string | object): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRATION })
}

// Verifies an access token and returns its payload, or null if invalid or expired
export function verifyAccessToken(token: string): jwt.JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);
    if (typeof payload === 'string') return null;
    return payload;
  } catch {
    return null
  }
}

// Signs a long-lived refresh token used to issue new access tokens
export function generateRefreshToken(payload: string | object): string {
  return jwt.sign(
    { ...(payload as object), jti: uuidv4() },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRATION }
  );
}

// Verifies a refresh token and returns its payload, or null if invalid or expired
export function verifyRefreshToken(token: string): jwt.JwtPayload | string | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET);
    if (typeof payload === 'string') return null;
    return payload;

  } catch {
    return null
  }
}

// Extracts and verifies the user payload from the Authorization header of a request
export function getUserFromToken(req: Request): JwtPayload | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  const payload = verifyAccessToken(token)

  if (!payload || typeof payload === 'string') return null
  return payload
}

