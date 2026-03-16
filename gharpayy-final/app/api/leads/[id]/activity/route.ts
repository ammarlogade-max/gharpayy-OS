import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { LeadActivity } from "@/models/LeadActivity";
import { Lead } from "@/models/Lead";
import { getCurrentUser } from "@/lib/auth";
import { ok, created, error, unauthorized, notFound, serverError } from "@/lib/response";

// Helper — supports both MongoDB _id and human-readable leadId (L1001)
async function findLeadByIdOrLeadId(id: string) {
  if (id.match(/^L\d+$/i)) {
    return Lead.findOne({ leadId: id });
  }
  return Lead.findById(id);
}

// GET /api/leads/[id]/activity — full timeline
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const lead = await findLeadByIdOrLeadId(id);
    if (!lead) return notFound("Lead");

    const activities = await LeadActivity.find({ leadId: lead._id })
      .populate("userId", "employeeName username role")
      .sort({ createdAt: -1 });

    return ok(activities);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/leads/[id]/activity — log an action
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const { actionType, notes, metadata } = await req.json();

    if (!actionType) return error("actionType is required");

    const lead = await findLeadByIdOrLeadId(id);
    if (!lead) return notFound("Lead");

    // Update callAttempts counter
    if (actionType === "call_made" || actionType === "call_no_answer") {
      await Lead.findByIdAndUpdate(lead._id, {
        $inc: { callAttempts: 1 },
        lastActivityTime: new Date(),
        modifiedBy: user.userId,
      });
    } else {
      await Lead.findByIdAndUpdate(lead._id, {
        lastActivityTime: new Date(),
        modifiedBy: user.userId,
      });
    }

    const activity = await LeadActivity.create({
      leadId: lead._id,
      userId: user.userId,
      actionType,
      notes: notes || "",
      metadata: metadata || {},
    });

    return created(activity);
  } catch (err) {
    return serverError(err);
  }
}