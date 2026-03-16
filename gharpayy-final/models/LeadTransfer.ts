import mongoose, { Schema, Document, Model } from "mongoose";

export type TransferReason =
  | "wrong_location"
  | "budget_mismatch"
  | "no_pg_available"
  | "customer_request"
  | "zone_reassignment"
  | "other";

export interface ILeadTransfer extends Document {
  leadId: mongoose.Types.ObjectId;
  fromZone: mongoose.Types.ObjectId | null;
  toZone: mongoose.Types.ObjectId | null;
  transferredBy: mongoose.Types.ObjectId;
  reason: TransferReason;
  notes: string;
  transferTime: Date;
  createdAt: Date;
}

const LeadTransferSchema = new Schema<ILeadTransfer>(
  {
    leadId:        { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    fromZone:      { type: Schema.Types.ObjectId, ref: "Zone", default: null },
    toZone:        { type: Schema.Types.ObjectId, ref: "Zone", default: null },
    transferredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason:        { type: String, enum: ["wrong_location","budget_mismatch","no_pg_available","customer_request","zone_reassignment","other"], required: true },
    notes:         { type: String, default: "" },
    transferTime:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const LeadTransfer: Model<ILeadTransfer> =
  mongoose.models.LeadTransfer ||
  mongoose.model<ILeadTransfer>("LeadTransfer", LeadTransferSchema);
