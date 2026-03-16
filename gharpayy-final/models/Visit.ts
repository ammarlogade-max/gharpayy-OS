import mongoose, { Schema, Document, Model } from "mongoose";

export type VisitStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface IVisit extends Document {
  visitId: string;
  leadId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  scheduledDate: Date;
  scheduledTime: string;        // "17:00"
  assignedTo: mongoose.Types.ObjectId;   // Fire user
  scheduledBy: mongoose.Types.ObjectId;  // Gamma user
  visitStatus: VisitStatus;
  feedback: string;
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema = new Schema<IVisit>(
  {
    visitId:       { type: String, unique: true },
    leadId:        { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    propertyId:    { type: Schema.Types.ObjectId, ref: "Property", required: true },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, default: "" },
    assignedTo:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    scheduledBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    visitStatus:   { type: String, enum: ["scheduled","completed","cancelled","no_show"], default: "scheduled" },
    feedback:      { type: String, default: "" },
  },
  { timestamps: true }
);

VisitSchema.pre("save", async function (next) {
  if (this.isNew && !this.visitId) {
    const count = await mongoose.model("Visit").countDocuments();
    this.visitId = `V${7001 + count}`;
  }
  next();
});

VisitSchema.index({ scheduledDate: 1, visitStatus: 1 });
VisitSchema.index({ leadId: 1 });

export const Visit: Model<IVisit> =
  mongoose.models.Visit || mongoose.model<IVisit>("Visit", VisitSchema);
