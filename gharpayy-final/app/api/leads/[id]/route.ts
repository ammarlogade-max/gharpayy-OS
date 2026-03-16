import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { LeadActivity } from "@/models/LeadActivity";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/response";

// Helper — supports both MongoDB _id and human-readable leadId (L1001)
async function findLeadByIdOrLeadId(id: string) {
  if (id.match(/^L\d+$/i)) {
    return Lead.findOne({ leadId: id })
      .populate("currentZoneId", "zoneName")
      .populate("currentOwnerId", "employeeName username role")
      .populate("createdBy", "employeeName username");
  }
  return Lead.findById(id)
    .populate("currentZoneId", "zoneName")
    .populate("currentOwnerId", "employeeName username role")
    .populate("createdBy", "employeeName username");
}

// GET /api/leads/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const lead = await findLeadByIdOrLeadId(id);
    if (!lead) return notFound("Lead");

    // Log view activity
    await LeadActivity.create({
      leadId: lead._id,
      userId: user.userId,
      actionType: "lead_viewed",
      notes: "",
    });

    await Lead.findByIdAndUpdate(lead._id, { lastActivityTime: new Date() });

    return ok(lead);
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/leads/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json();

    // Find first to get real _id
    const existing = await findLeadByIdOrLeadId(id);
    if (!existing) return notFound("Lead");

    const lead = await Lead.findByIdAndUpdate(
      existing._id,
      { ...body, modifiedBy: user.userId, lastActivityTime: new Date() },
      { new: true, runValidators: true }
    );

    await LeadActivity.create({
      leadId: existing._id,
      userId: user.userId,
      actionType: "stage_updated",
      notes: `Lead updated by ${user.username}`,
      metadata: body,
    });

    return ok(lead);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/leads/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();
    const { id } = await params;

    const existing = await findLeadByIdOrLeadId(id);
    if (!existing) return notFound("Lead");

    await Lead.findByIdAndDelete(existing._id);
    return ok({ message: "Lead deleted" });
  } catch (err) {
    return serverError(err);
  }
}