import mongoose, { Schema, Document, Model } from "mongoose";

export type ActionType =
  | "lead_created"
  | "lead_viewed"
  | "call_made"
  | "call_no_answer"
  | "whatsapp_sent"
  | "stage_updated"
  | "visit_scheduled"
  | "visit_completed"
  | "visit_cancelled"
  | "note_added"
  | "lead_transferred"
  | "lead_claimed"
  | "booking_confirmed"
  | "lead_lost";

export interface ILeadActivity extends Document {
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  actionType: ActionType;
  notes: string;
  metadata: Record<string, unknown>;   // Extra data e.g. { fromStage, toStage }
  createdAt: Date;
}

const LeadActivitySchema = new Schema<ILeadActivity>(
  {
    leadId:     { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    actionType: { type: String, required: true },
    notes:      { type: String, default: "" },
    metadata:   { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

LeadActivitySchema.index({ leadId: 1, createdAt: -1 });

export const LeadActivity: Model<ILeadActivity> =
  mongoose.models.LeadActivity ||
  mongoose.model<ILeadActivity>("LeadActivity", LeadActivitySchema);
