import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { LeadActivity } from "@/models/LeadActivity";
import { getCurrentUser } from "@/lib/auth";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/response";

const VALID_STAGES = [
  "new_lead","contacted","qualified","visit_scheduled",
  "visit_completed","negotiation","booked","lost"
];

// Helper — supports both MongoDB _id and human-readable leadId (L1001)
async function findLeadByIdOrLeadId(id: string) {
  if (id.match(/^L\d+$/i)) {
    return Lead.findOne({ leadId: id });
  }
  return Lead.findById(id);
}

// PATCH /api/leads/[id]/stage
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const { stage, notes } = await req.json();

    if (!stage || !VALID_STAGES.includes(stage))
      return error(`Invalid stage. Valid: ${VALID_STAGES.join(", ")}`);

    const lead = await findLeadByIdOrLeadId(id);
    if (!lead) return notFound("Lead");

    const fromStage = lead.stage;
    lead.stage = stage;
    lead.lastActivityTime = new Date();
    lead.modifiedBy = user.userId as any;

    // Auto-set temperature based on stage
    if (["visit_scheduled","visit_completed","negotiation"].includes(stage)) {
      lead.leadTemperature = "hot";
    } else if (stage === "contacted" || stage === "qualified") {
      lead.leadTemperature = "warm";
    } else if (stage === "lost") {
      lead.leadTemperature = "cold";
    }

    await lead.save();

    await LeadActivity.create({
      leadId: lead._id,
      userId: user.userId,
      actionType: "stage_updated",
      notes: notes || `Stage changed: ${fromStage} → ${stage}`,
      metadata: { fromStage, toStage: stage },
    });

    return ok(lead);
  } catch (err) {
    return serverError(err);
  }
}