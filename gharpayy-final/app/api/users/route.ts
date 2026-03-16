import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized, forbidden, serverError } from "@/lib/response";

// GET /api/users
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const zoneId = searchParams.get("zoneId");

    let query: Record<string, unknown> = {};

    // super_admin sees everyone
    // zone_admin sees only their zone
    // others see only their own zone
    if (user.role === "super_admin") {
      if (zoneId) query.zoneId = zoneId;
    } else if (user.role === "zone_admin") {
      query.zoneId = user.zoneId;
    } else {
      // alpha, beta, gamma, fire, water — see their own zone only
      query.zoneId = user.zoneId;
    }

    const users = await User.find(query)
      .populate("zoneId", "zoneName")
      .sort({ employeeName: 1 });

    return ok(users);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/users — create user (admin only)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const body = await req.json();
    const { username, password, employeeName, role, zoneId } = body;

    if (!username || !password || !employeeName || !role)
      return error("username, password, employeeName, role are required");

    // Zone admin can only create sub-roles in their own zone
    if (currentUser.role === "zone_admin") {
      if (role === "super_admin" || role === "zone_admin") return forbidden();
      if (String(zoneId) !== String(currentUser.zoneId)) return forbidden();
    }

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return error("Username already taken");

    const newUser = await User.create({
      username,
      passwordHash: password,
      employeeName,
      role,
      zoneId: zoneId || null,
    });

    return created(newUser);
  } catch (err) {
    return serverError(err);
  }
}