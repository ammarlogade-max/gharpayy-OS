import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { Lead } from "@/models/Lead";
import { Property } from "@/models/Property";
import { LeadActivity } from "@/models/LeadActivity";
import { getCurrentUser } from "@/lib/auth";
import { ok, created, error, unauthorized, serverError } from "@/lib/response";

// GET /api/bookings
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const zoneId = searchParams.get("zoneId");

    const query: Record<string, unknown> = {};
    if (status) query.bookingStatus = status;

    // If zone-level user, filter by properties in their zone
    let propertyIds: string[] = [];
    const effectiveZone = zoneId || user.zoneId;
    if (effectiveZone) {
      const properties = await Property.find({ zoneId: effectiveZone }, "_id");
      propertyIds = properties.map((p) => String(p._id));
      if (propertyIds.length > 0) query.propertyId = { $in: propertyIds };
    }

    const bookings = await Booking.find(query)
      .populate("leadId", "leadName phone email")
      .populate("propertyId", "propertyName address location")
      .populate("bookedBy", "employeeName username")
      .sort({ createdAt: -1 });

    return ok(bookings);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/bookings — confirm booking
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const { leadId, propertyId, rentPrice, tokenPaid, paymentMode, bedType } = body;

    if (!leadId || !propertyId || !rentPrice)
      return error("leadId, propertyId, rentPrice are required");

    const booking = await Booking.create({
      ...body,
      bookedBy: user.userId,
      bookingStatus: "confirmed",
    });

    // Update lead stage to booked
    await Lead.findByIdAndUpdate(leadId, {
      stage: "booked",
      lastActivityTime: new Date(),
      modifiedBy: user.userId,
    });

    // Decrease available beds
    await Property.findByIdAndUpdate(propertyId, {
      $inc: { availableBeds: -1 },
    });

    await LeadActivity.create({
      leadId,
      userId: user.userId,
      actionType: "booking_confirmed",
      notes: `Booking confirmed. Rent: ₹${rentPrice}, Token: ₹${tokenPaid || 0}`,
      metadata: { bookingId: booking._id, propertyId, rentPrice, tokenPaid },
    });

    return created(booking);
  } catch (err) {
    return serverError(err);
  }
}
