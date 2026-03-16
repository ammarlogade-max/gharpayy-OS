import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { Room } from "@/models/Room";
import { ok, error, unauthorized, forbidden, serverError, created } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await connectDB();
    const { searchParams } = new URL(req.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (searchParams.get("propertyId"))    query.propertyId    = searchParams.get("propertyId");
    if (searchParams.get("status"))        query.status        = searchParams.get("status");
    if (searchParams.get("genderAllowed")) query.genderAllowed = searchParams.get("genderAllowed");
    if (searchParams.get("availableOnly") === "true") query.availableBeds = { $gt: 0 };
    const rooms = await Room.find(query).populate("propertyId","propertyName location").sort({ createdAt: -1 }).lean();
    return ok({ rooms, count: rooms.length });
  } catch (err) { return serverError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB();
    const { propertyId, roomNumber, floor, roomType, totalBeds, rentPrice, amenities, genderAllowed } = await req.json();
    if (!propertyId || !roomNumber) return error("propertyId and roomNumber are required");
    const room = await Room.create({ propertyId, roomNumber, floor: floor||0, roomType: roomType||"double", totalBeds: totalBeds||1, availableBeds: totalBeds||1, rentPrice: rentPrice||0, amenities: amenities||[], genderAllowed: genderAllowed||"coed" });
    return created(room);
  } catch (err) { return serverError(err); }
}
