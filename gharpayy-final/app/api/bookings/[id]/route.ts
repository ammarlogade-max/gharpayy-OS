import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const booking = await Booking.findById(id)
      .populate("leadId", "leadName phone email")
      .populate("propertyId", "propertyName address")
      .populate("bookedBy", "employeeName username");
    if (!booking) return notFound("Booking");
    return ok(booking);
  } catch (err) { return serverError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    const { id } = await params;
    const body = await req.json();
    const booking = await Booking.findByIdAndUpdate(id, body, { new: true });
    if (!booking) return notFound("Booking");
    return ok(booking);
  } catch (err) { return serverError(err); }
}
