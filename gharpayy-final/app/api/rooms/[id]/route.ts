import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { Room } from "@/models/Room";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    await connectDB(); const { id } = await params;
    const room = await Room.findById(id).populate("propertyId","propertyName location address").lean();
    if (!room) return notFound("Room");
    return ok(room);
  } catch (err) { return serverError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB(); const { id } = await params;
    const room = await Room.findByIdAndUpdate(id, { $set: await req.json() }, { new: true, runValidators: true });
    if (!room) return notFound("Room");
    return ok(room);
  } catch (err) { return serverError(err); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB(); const { id } = await params;
    const room = await Room.findByIdAndDelete(id);
    if (!room) return notFound("Room");
    return ok({ deleted: true, roomId: room.roomId });
  } catch (err) { return serverError(err); }
}
