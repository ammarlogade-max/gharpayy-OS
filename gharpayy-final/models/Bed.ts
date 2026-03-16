import mongoose, { Schema, Document, Model } from "mongoose";

export type BedStatus = "available" | "reserved" | "occupied" | "maintenance";

export interface IBed extends Document {
  bedId: string;
  roomId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  bedNumber: string;
  status: BedStatus;
  currentLeadId: mongoose.Types.ObjectId | null;
  currentBookingId: mongoose.Types.ObjectId | null;
  reservedAt: Date | null;
  occupiedAt: Date | null;
  vacatedAt: Date | null;
  rentPrice: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const BedSchema = new Schema<IBed>(
  {
    bedId:            { type: String, unique: true },
    roomId:           { type: Schema.Types.ObjectId, ref: "Room", required: true },
    propertyId:       { type: Schema.Types.ObjectId, ref: "Property", required: true },
    bedNumber:        { type: String, required: true, trim: true },
    status:           { type: String, enum: ["available","reserved","occupied","maintenance"], default: "available" },
    currentLeadId:    { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    currentBookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    reservedAt:       { type: Date, default: null },
    occupiedAt:       { type: Date, default: null },
    vacatedAt:        { type: Date, default: null },
    rentPrice:        { type: Number, default: 0 },
    notes:            { type: String, default: "" },
  },
  { timestamps: true }
);

BedSchema.pre("save", async function (next) {
  if (this.isNew && !this.bedId) {
    const count = await mongoose.model("Bed").countDocuments();
    this.bedId = `BED-${String(count+1).padStart(4,"0")}`;
  }
  next();
});

BedSchema.index({ propertyId: 1, status: 1 });
BedSchema.index({ roomId: 1, status: 1 });

export const Bed: Model<IBed> =
  mongoose.models.Bed || mongoose.model<IBed>("Bed", BedSchema);
