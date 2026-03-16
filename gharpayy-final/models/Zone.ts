import mongoose, { Schema, Document, Model } from "mongoose";

export interface IZone extends Document {
  zoneName: string;
  zoneManager: string;
  areas: string[];           // e.g. ["Indiranagar", "Domlur"]
  status: "active" | "inactive";
  autoAssign: boolean;       // Zone Lead Switch — auto-route leads by location
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>(
  {
    zoneName:     { type: String, required: true, unique: true, trim: true },
    zoneManager:  { type: String, default: "" },
    areas:        [{ type: String }],
    status:       { type: String, enum: ["active", "inactive"], default: "active" },
    autoAssign:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Zone: Model<IZone> =
  mongoose.models.Zone || mongoose.model<IZone>("Zone", ZoneSchema);
