import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;
const COOKIE_NAME = "gharpayy_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;      // super_admin | zone_admin | alpha | beta | gamma | fire | water
  zoneId: string | null;
  zoneName: string | null;
}

// Sign a JWT and return it
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Verify a JWT token string
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Get current user from cookie (use in API route handlers)
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Build set-cookie header string for login
export function buildLoginCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

// Build logout cookie (expires immediately)
export function buildLogoutCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

// Role hierarchy helpers
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ZONE_ADMIN: "zone_admin",
  ALPHA: "alpha",      // Lead closer
  BETA: "beta",        // Lead distributor
  GAMMA: "gamma",      // Tour scheduler
  FIRE: "fire",        // Visit manager
  WATER: "water",      // Customer support
} as const;

export function isAdmin(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ZONE_ADMIN;
}

export function isSuperAdmin(role: string): boolean {
  return role === ROLES.SUPER_ADMIN;
}
