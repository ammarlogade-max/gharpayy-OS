import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { Bed } from "@/models/Bed";
import { Room } from "@/models/Room";
import { ok, error, unauthorized, forbidden, serverError, created } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    await connectDB();
    const { searchParams } = new URL(req.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (searchParams.get("propertyId")) query.propertyId = searchParams.get("propertyId");
    if (searchParams.get("roomId"))     query.roomId     = searchParams.get("roomId");
    if (searchParams.get("status"))     query.status     = searchParams.get("status");
    const beds = await Bed.find(query).populate("roomId","roomNumber floor roomType").populate("propertyId","propertyName location").sort({ bedNumber: 1 }).lean();
    return ok({ beds, count: beds.length });
  } catch (err) { return serverError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB();
    const { roomId, propertyId, bedNumber, rentPrice } = await req.json();
    if (!roomId || !propertyId || !bedNumber) return error("roomId, propertyId, bedNumber required");
    const room = await Room.findById(roomId);
    if (!room) return error("Room not found");
    const bed = await Bed.create({ roomId, propertyId, bedNumber, rentPrice: rentPrice||room.rentPrice, status:"available" });
    await Room.findByIdAndUpdate(roomId, { $inc: { totalBeds:1, availableBeds:1 } });
    return created(bed);
  } catch (err) { return serverError(err); }
}
