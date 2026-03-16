import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Visit } from "@/models/Visit";
import { Lead } from "@/models/Lead";
import { LeadActivity } from "@/models/LeadActivity";
import { getCurrentUser } from "@/lib/auth";
import { ok, created, error, unauthorized, serverError } from "@/lib/response";

// GET /api/visits
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");

    const query: Record<string, unknown> = {};

    // Fire role sees only their assigned visits
    if (user.role === "fire") query.assignedTo = user.userId;
    else if (assignedTo) query.assignedTo = assignedTo;

    if (status) query.visitStatus = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.scheduledDate = { $gte: start, $lt: end };
    }

    const visits = await Visit.find(query)
      .populate("leadId", "leadName phone locationPreference")
      .populate("propertyId", "propertyName address location")
      .populate("assignedTo", "employeeName username")
      .populate("scheduledBy", "employeeName username")
      .sort({ scheduledDate: 1 });

    return ok(visits);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/visits — schedule a visit
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await req.json();
    const { leadId, propertyId, scheduledDate, scheduledTime, assignedTo } = body;

    if (!leadId || !propertyId || !scheduledDate || !assignedTo)
      return error("leadId, propertyId, scheduledDate, assignedTo are required");

    const visit = await Visit.create({
      ...body,
      scheduledBy: user.userId,
    });

    // Update lead stage and visit count
    await Lead.findByIdAndUpdate(leadId, {
      stage: "visit_scheduled",
      $inc: { visitCount: 1 },
      lastActivityTime: new Date(),
      modifiedBy: user.userId,
    });

    await LeadActivity.create({
      leadId,
      userId: user.userId,
      actionType: "visit_scheduled",
      notes: `Visit scheduled for ${scheduledDate}`,
      metadata: { visitId: visit._id, propertyId, scheduledDate },
    });

    return created(visit);
  } catch (err) {
    return serverError(err);
  }
}
