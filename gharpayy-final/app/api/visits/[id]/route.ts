import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Visit } from "@/models/Visit";
import { Lead } from "@/models/Lead";
import { LeadActivity } from "@/models/LeadActivity";
import { getCurrentUser } from "@/lib/auth";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const visit = await Visit.findById(id)
      .populate("leadId", "leadName phone")
      .populate("propertyId", "propertyName address")
      .populate("assignedTo", "employeeName username")
      .populate("scheduledBy", "employeeName username");
    if (!visit) return notFound("Visit");
    return ok(visit);
  } catch (err) { return serverError(err); }
}

// PATCH /api/visits/[id] — update status, add feedback
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json();

    const visit = await Visit.findByIdAndUpdate(id, body, { new: true });
    if (!visit) return notFound("Visit");

    // If completed, update lead stage
    if (body.visitStatus === "completed") {
      await Lead.findByIdAndUpdate(visit.leadId, {
        stage: "visit_completed",
        lastActivityTime: new Date(),
        modifiedBy: user.userId,
      });
      await LeadActivity.create({
        leadId: visit.leadId,
        userId: user.userId,
        actionType: "visit_completed",
        notes: body.feedback || "Visit completed",
        metadata: { visitId: id },
      });
    } else if (body.visitStatus === "cancelled") {
      await LeadActivity.create({
        leadId: visit.leadId,
        userId: user.userId,
        actionType: "visit_cancelled",
        notes: body.feedback || "Visit cancelled",
        metadata: { visitId: id },
      });
    }

    return ok(visit);
  } catch (err) { return serverError(err); }
}
