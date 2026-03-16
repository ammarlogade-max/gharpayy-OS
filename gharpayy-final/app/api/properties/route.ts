import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Property } from "@/models/Property";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized, forbidden, serverError } from "@/lib/response";

// GET /api/properties
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const zoneId = searchParams.get("zoneId");
    const gender = searchParams.get("gender");
    const available = searchParams.get("available");

    const query: Record<string, unknown> = { status: "active" };

    if (zoneId) query.zoneId = zoneId;
    else if (user.zoneId && !isAdmin(user.role)) query.zoneId = user.zoneId;

    if (gender) query.genderAllowed = gender;
    if (available === "true") query.availableBeds = { $gt: 0 };

    const properties = await Property.find(query)
      .populate("zoneId", "zoneName")
      .sort({ propertyName: 1 });

    return ok(properties);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/properties
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const body = await req.json();
    if (!body.propertyName || !body.zoneId)
      return error("propertyName and zoneId are required");

    const property = await Property.create(body);
    return created(property);
  } catch (err) {
    return serverError(err);
  }
}
