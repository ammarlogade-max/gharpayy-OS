import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { Visit } from "@/models/Visit";
import { Booking } from "@/models/Booking";
import { Zone } from "@/models/Zone";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/response";

// GET /api/dashboard — stats for current user's scope
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const zoneId = searchParams.get("zoneId") || user.zoneId;

    const leadFilter: Record<string, unknown> = {};
    if (zoneId) leadFilter.currentZoneId = zoneId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Lead counts by stage
    const stageCounts = await Lead.aggregate([
      { $match: leadFilter },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]);

    // Today's leads
    const leadsToday = await Lead.countDocuments({
      ...leadFilter,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // Total leads
    const totalLeads = await Lead.countDocuments(leadFilter);

    // Global pool (unowned)
    const globalPool = await Lead.countDocuments({ currentZoneId: null });

    // Today's visits
    const visitsToday = await Visit.countDocuments({
      scheduledDate: { $gte: today, $lt: tomorrow },
      ...(zoneId ? {} : {}),
    });

    // Total bookings
    const totalBookings = await Booking.countDocuments({
      bookingStatus: "confirmed",
    });

    // Conversion rate
    const conversionRate =
      totalLeads > 0 ? Math.round((totalBookings / totalLeads) * 100) : 0;

    // Lead temperature breakdown
    const tempBreakdown = await Lead.aggregate([
      { $match: leadFilter },
      { $group: { _id: "$leadTemperature", count: { $sum: 1 } } },
    ]);

    // Lead source breakdown
    const sourceBreakdown = await Lead.aggregate([
      { $match: leadFilter },
      { $group: { _id: "$leadSource", count: { $sum: 1 } } },
    ]);

    // Zone performance (super admin only)
    let zonePerformance: unknown[] = [];
    if (!zoneId) {
      zonePerformance = await Lead.aggregate([
        { $match: { currentZoneId: { $ne: null } } },
        {
          $group: {
            _id: "$currentZoneId",
            totalLeads: { $sum: 1 },
            booked: { $sum: { $cond: [{ $eq: ["$stage", "booked"] }, 1, 0] } },
          },
        },
        {
          $lookup: {
            from: "zones",
            localField: "_id",
            foreignField: "_id",
            as: "zone",
          },
        },
        { $unwind: { path: "$zone", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            zoneName: "$zone.zoneName",
            totalLeads: 1,
            booked: 1,
          },
        },
      ]);
    }

    // Funnel data
    const funnelStages = [
      "new_lead","contacted","qualified",
      "visit_scheduled","visit_completed","negotiation","booked"
    ];
    const stageMap: Record<string, number> = {};
    stageCounts.forEach((s) => { stageMap[s._id] = s.count; });
    const funnel = funnelStages.map((stage) => ({
      stage,
      count: stageMap[stage] || 0,
    }));

    return ok({
      summary: {
        totalLeads,
        leadsToday,
        visitsToday,
        totalBookings,
        conversionRate,
        globalPool,
      },
      funnel,
      temperatureBreakdown: tempBreakdown,
      sourceBreakdown,
      zonePerformance,
    });
  } catch (err) {
    return serverError(err);
  }
}
