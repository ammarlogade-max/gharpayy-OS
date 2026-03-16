import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { LeadTransfer } from "@/models/LeadTransfer";
import { LeadOwnership } from "@/models/LeadOwnership";
import { LeadActivity } from "@/models/LeadActivity";
import { Notification } from "@/models/Notification";
import { Zone } from "@/models/Zone";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { ok, error, unauthorized, notFound, serverError } from "@/lib/response";

// POST /api/leads/[id]/transfer
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const { toZoneId, reason, notes } = await req.json();

    if (!reason) return error("Transfer reason is required");

    const lead = await Lead.findById(id);
    if (!lead) return notFound("Lead");

    const fromZoneId = lead.currentZoneId;

    // Update lead zone
    lead.currentZoneId = toZoneId || null;
    lead.currentOwnerId = null;
    lead.lastActivityTime = new Date();
    lead.modifiedBy = user.userId as any;
    await lead.save();

    // Mark old ownership as transferred
    await LeadOwnership.updateMany(
      { leadId: id, ownershipStatus: "active" },
      { ownershipStatus: "transferred" }
    );

    // Create new ownership record
    await LeadOwnership.create({
      leadId: id,
      zoneId: toZoneId || null,
      assignedToUser: null,
      ownershipStatus: "active",
    });

    // Log transfer
    await LeadTransfer.create({
      leadId: id,
      fromZone: fromZoneId,
      toZone: toZoneId || null,
      transferredBy: user.userId,
      reason,
      notes: notes || "",
    });

    // Log activity
    const toZone = toZoneId ? await Zone.findById(toZoneId) : null;
    await LeadActivity.create({
      leadId: id,
      userId: user.userId,
      actionType: "lead_transferred",
      notes: notes || `Transferred to ${toZone?.zoneName || "Global Pool"}`,
      metadata: { fromZoneId, toZoneId, reason },
    });

    // Notify zone admins in the new zone
    if (toZoneId) {
      const zoneAdmins = await User.find({ zoneId: toZoneId, role: "zone_admin", status: "active" });
      await Notification.insertMany(
        zoneAdmins.map((admin) => ({
          userId: admin._id,
          leadId: id,
          message: `New lead transferred to your zone: ${lead.leadName}`,
          type: "lead_assigned",
        }))
      );
    }

    return ok({ message: "Lead transferred successfully", lead });
  } catch (err) {
    return serverError(err);
  }
}
