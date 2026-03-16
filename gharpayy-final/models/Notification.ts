import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId | null;
  message: string;
  type: "lead_assigned" | "lead_aging" | "visit_reminder" | "booking_confirmed" | "general";
  status: "unread" | "read";
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    leadId:  { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    message: { type: String, required: true },
    type:    { type: String, enum: ["lead_assigned","lead_aging","visit_reminder","booking_confirmed","general"], default: "general" },
    status:  { type: String, enum: ["unread","read"], default: "unread" },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, status: 1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
