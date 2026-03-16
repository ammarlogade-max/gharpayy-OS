import mongoose, { Schema, Document, Model } from "mongoose";

export type LeadStage =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "visit_scheduled"
  | "visit_completed"
  | "negotiation"
  | "booked"
  | "lost";

export type LeadSource =
  | "website"
  | "whatsapp"
  | "walk_in"
  | "instagram"
  | "referral"
  | "partner";

export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadIntent =
  | "just_browsing"
  | "comparing_options"
  | "ready_to_visit"
  | "ready_to_book";

export interface ILead extends Document {
  leadId: string;                        // Human readable: L1001
  leadName: string;
  phone: string;
  email: string;
  moveInDate: string;
  budget: string;
  locationPreference: string;
  peopleCount: number;
  accommodationType: string;             // Single / Double / Triple / Studio
  occupation: string;                    // Student / Working / Intern
  inBlr: boolean;                        // Inside Bangalore or not
  leadSource: LeadSource;
  subPipeline: string;                   // Student / Working Professional
  stage: LeadStage;
  leadScore: number;                     // 0-10
  leadTemperature: LeadTemperature;
  leadIntent: LeadIntent;
  tag: string;                           // Hot lead / VIP / Referral
  callAttempts: number;
  visitCount: number;
  followUpCount: number;
  nextFollowUpDate: Date | null;
  // Additional fields
  genderPreference: string;
  foodPreference: string;
  smokingPreference: string;
  companyOrCollege: string;
  specialRequests: string;
  city: string;
  // Ownership
  currentZoneId: mongoose.Types.ObjectId | null;
  currentOwnerId: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  modifiedBy: mongoose.Types.ObjectId | null;
  lastActivityTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    leadId:             { type: String, unique: true },
    leadName:           { type: String, required: true, trim: true },
    phone:              { type: String, required: true, trim: true },
    email:              { type: String, default: "", trim: true },
    moveInDate:         { type: String, default: "" },
    budget:             { type: String, default: "" },
    locationPreference: { type: String, default: "" },
    peopleCount:        { type: Number, default: 1 },
    accommodationType:  { type: String, default: "" },
    occupation:         { type: String, default: "" },
    inBlr:              { type: Boolean, default: true },
    leadSource:         { type: String, enum: ["website","whatsapp","walk_in","instagram","referral","partner"], default: "whatsapp" },
    subPipeline:        { type: String, default: "" },
    stage:              { type: String, enum: ["new_lead","contacted","qualified","visit_scheduled","visit_completed","negotiation","booked","lost"], default: "new_lead" },
    leadScore:          { type: Number, default: 0, min: 0, max: 10 },
    leadTemperature:    { type: String, enum: ["hot","warm","cold"], default: "warm" },
    leadIntent:         { type: String, enum: ["just_browsing","comparing_options","ready_to_visit","ready_to_book"], default: "just_browsing" },
    tag:                { type: String, default: "" },
    callAttempts:       { type: Number, default: 0 },
    visitCount:         { type: Number, default: 0 },
    followUpCount:      { type: Number, default: 0 },
    nextFollowUpDate:   { type: Date, default: null },
    genderPreference:   { type: String, default: "" },
    foodPreference:     { type: String, default: "" },
    smokingPreference:  { type: String, default: "" },
    companyOrCollege:   { type: String, default: "" },
    specialRequests:    { type: String, default: "" },
    city:               { type: String, default: "Bangalore" },
    currentZoneId:      { type: Schema.Types.ObjectId, ref: "Zone", default: null },
    currentOwnerId:     { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy:          { type: Schema.Types.ObjectId, ref: "User", required: true },
    modifiedBy:         { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastActivityTime:   { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate human-readable Lead ID
LeadSchema.pre("save", async function (next) {
  if (this.isNew && !this.leadId) {
    const count = await mongoose.model("Lead").countDocuments();
    this.leadId = `L${1001 + count}`;
  }
  next();
});

// Indexes for common queries
LeadSchema.index({ currentZoneId: 1, stage: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ createdAt: -1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
