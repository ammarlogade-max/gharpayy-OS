import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { LeadActivity } from "@/models/LeadActivity";
import { LeadOwnership } from "@/models/LeadOwnership";
import { Zone } from "@/models/Zone";
import { getCurrentUser } from "@/lib/auth";
import { ok, created, error, unauthorized, serverError } from "@/lib/response";

// GET /api/leads — list leads with filters
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const stage = searchParams.get("stage");
    const zoneId = searchParams.get("zoneId");
    const search = searchParams.get("search");
    const pool = searchParams.get("pool"); // "global" = unowned leads
    const temperature = searchParams.get("temperature");
    const source = searchParams.get("source");

    const query: Record<string, unknown> = {};

    // Zone-based filtering
    if (user.role === "zone_admin" || ["alpha","beta","gamma","fire","water"].includes(user.role)) {
      if (user.zoneId) {
        if (pool === "global") {
          query.currentZoneId = null; // global pool
        } else {
          query.currentZoneId = user.zoneId;
        }
      }
    } else if (zoneId) {
      query.currentZoneId = zoneId === "global" ? null : zoneId;
    }

    if (stage) query.stage = stage;
    if (temperature) query.leadTemperature = temperature;
    if (source) query.leadSource = source;

    if (search) {
      query.$or = [
        { leadName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { locationPreference: { $regex: search, $options: "i" } },
        { leadId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate("currentZoneId", "zoneName")
        .populate("currentOwnerId", "employeeName username role")
        .populate("createdBy", "employeeName username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(query),
    ]);

    return ok({
      leads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/leads — create a new lead
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const { leadName, phone } = body;
    if (!leadName || !phone) return error("leadName and phone are required");

    // Check duplicate phone
    const duplicate = await Lead.findOne({ phone });
    if (duplicate) {
      return ok({
        warning: "Possible duplicate",
        existingLead: { leadId: duplicate.leadId, leadName: duplicate.leadName, stage: duplicate.stage },
      }, 200);
    }

    // Auto-assign zone based on location if autoAssign is ON
    let assignedZoneId = user.zoneId || null;
    if (!assignedZoneId && body.locationPreference) {
      const zones = await Zone.find({ autoAssign: true, status: "active" });
      for (const zone of zones) {
        const match = zone.areas.some((area: string) =>
          body.locationPreference.toLowerCase().includes(area.toLowerCase())
        );
        if (match) { assignedZoneId = String(zone._id); break; }
      }
    }

    const lead = await Lead.create({
      ...body,
      currentZoneId: assignedZoneId,
      currentOwnerId: user.userId,
      createdBy: user.userId,
      lastActivityTime: new Date(),
    });

    // Create ownership record
    await LeadOwnership.create({
      leadId: lead._id,
      zoneId: assignedZoneId,
      assignedToUser: user.userId,
    });

    // Log activity
    await LeadActivity.create({
      leadId: lead._id,
      userId: user.userId,
      actionType: "lead_created",
      notes: `Lead created by ${user.username}`,
    });

    return created(lead);
  } catch (err) {
    return serverError(err);
  }
}
