import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { Bed, BedStatus } from "@/models/Bed";
import { Room } from "@/models/Room";
import { ok, error, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

const VALID: Record<BedStatus, BedStatus[]> = { available:["reserved","maintenance"], reserved:["occupied","available"], occupied:["reserved"], maintenance:["available"] };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    await connectDB(); const { id } = await params;
    const bed = await Bed.findById(id).populate("roomId","roomNumber floor roomType rentPrice").populate("propertyId","propertyName location address").populate("currentLeadId","leadName phone").lean();
    if (!bed) return notFound("Bed");
    return ok(bed);
  } catch (err) { return serverError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    await connectDB(); const { id } = await params;
    const { status, leadId, bookingId, notes } = await req.json();
    const bed = await Bed.findById(id); if (!bed) return notFound("Bed");

    if (status && status !== bed.status) {
      const allowed = VALID[bed.status as BedStatus];
      if (!allowed.includes(status as BedStatus)) return error(`Invalid: ${bed.status} → ${status}. Allowed: ${allowed.join(", ")}`);
      const now = new Date();
      if (status === "reserved") { bed.reservedAt = now; bed.currentLeadId = leadId||null; bed.currentBookingId = bookingId||null; if (bed.status==="available") await Room.findByIdAndUpdate(bed.roomId,{$inc:{availableBeds:-1,reservedBeds:1}}); }
      if (status === "occupied") { bed.occupiedAt = now; await Room.findByIdAndUpdate(bed.roomId,{$inc:{reservedBeds:-1,occupiedBeds:1}}); }
      if (status === "available") { const wasOcc=bed.status==="occupied", wasRes=bed.status==="reserved"; bed.vacatedAt=now; bed.currentLeadId=null; bed.currentBookingId=null; bed.reservedAt=null; bed.occupiedAt=null; if(wasOcc)await Room.findByIdAndUpdate(bed.roomId,{$inc:{occupiedBeds:-1,availableBeds:1}}); if(wasRes)await Room.findByIdAndUpdate(bed.roomId,{$inc:{reservedBeds:-1,availableBeds:1}}); }
      bed.status = status as BedStatus;
    }
    if (notes !== undefined) bed.notes = notes;
    await bed.save();
    return ok(bed);
  } catch (err) { return serverError(err); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(); if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    await connectDB(); const { id } = await params;
    const bed = await Bed.findById(id); if (!bed) return notFound("Bed");
    if (bed.status !== "available") return error("Cannot delete a reserved or occupied bed.");
    await Bed.findByIdAndDelete(id);
    await Room.findByIdAndUpdate(bed.roomId,{$inc:{totalBeds:-1,availableBeds:-1}});
    return ok({ deleted: true, bedId: bed.bedId });
  } catch (err) { return serverError(err); }
}
