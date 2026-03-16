import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Zone } from "@/models/Zone";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized, forbidden, serverError } from "@/lib/response";

// GET /api/zones — list all zones
export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const zones = await Zone.find().sort({ zoneName: 1 });
    return ok(zones);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/zones — create zone (super_admin only)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isSuperAdmin(user.role)) return forbidden();

    const body = await req.json();
    const { zoneName, zoneManager, areas, autoAssign } = body;

    if (!zoneName) return error("zoneName is required");

    const exists = await Zone.findOne({ zoneName });
    if (exists) return error("Zone with this name already exists");

    const zone = await Zone.create({ zoneName, zoneManager, areas, autoAssign });
    return created(zone);
  } catch (err) {
    return serverError(err);
  }
}
