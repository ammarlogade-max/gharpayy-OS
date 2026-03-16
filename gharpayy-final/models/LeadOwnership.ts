import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadOwnership extends Document {
  leadId: mongoose.Types.ObjectId;
  zoneId: mongoose.Types.ObjectId | null;
  assignedToUser: mongoose.Types.ObjectId | null;
  assignedAt: Date;
  ownershipStatus: "active" | "transferred" | "released";
  createdAt: Date;
  updatedAt: Date;
}

const LeadOwnershipSchema = new Schema<ILeadOwnership>(
  {
    leadId:          { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    zoneId:          { type: Schema.Types.ObjectId, ref: "Zone", default: null },
    assignedToUser:  { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt:      { type: Date, default: Date.now },
    ownershipStatus: { type: String, enum: ["active","transferred","released"], default: "active" },
  },
  { timestamps: true }
);

LeadOwnershipSchema.index({ leadId: 1, ownershipStatus: 1 });

export const LeadOwnership: Model<ILeadOwnership> =
  mongoose.models.LeadOwnership ||
  mongoose.model<ILeadOwnership>("LeadOwnership", LeadOwnershipSchema);
