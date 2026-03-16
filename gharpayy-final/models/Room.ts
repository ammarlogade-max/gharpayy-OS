import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoom extends Document {
  roomId: string;
  propertyId: mongoose.Types.ObjectId;
  roomNumber: string;
  floor: number;
  roomType: "single" | "double" | "triple" | "quad" | "studio";
  totalBeds: number;
  availableBeds: number;
  reservedBeds: number;
  occupiedBeds: number;
  rentPrice: number;
  amenities: string[];
  genderAllowed: "boys" | "girls" | "coed";
  status: "active" | "inactive" | "maintenance";
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    roomId:        { type: String, unique: true },
    propertyId:    { type: Schema.Types.ObjectId, ref: "Property", required: true },
    roomNumber:    { type: String, required: true, trim: true },
    floor:         { type: Number, default: 0 },
    roomType:      { type: String, enum: ["single","double","triple","quad","studio"], default: "double" },
    totalBeds:     { type: Number, default: 1 },
    availableBeds: { type: Number, default: 1 },
    reservedBeds:  { type: Number, default: 0 },
    occupiedBeds:  { type: Number, default: 0 },
    rentPrice:     { type: Number, default: 0 },
    amenities:     [{ type: String }],
    genderAllowed: { type: String, enum: ["boys","girls","coed"], default: "coed" },
    status:        { type: String, enum: ["active","inactive","maintenance"], default: "active" },
  },
  { timestamps: true }
);

RoomSchema.pre("save", async function (next) {
  if (this.isNew && !this.roomId) {
    const count = await mongoose.model("Room").countDocuments();
    this.roomId = `RM-${String(count+1).padStart(3,"0")}`;
  }
  next();
});

RoomSchema.index({ propertyId: 1, status: 1 });

export const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);
