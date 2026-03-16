import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProperty extends Document {
  propertyId: string;
  propertyName: string;
  zoneId: mongoose.Types.ObjectId;
  address: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  totalBeds: number;
  availableBeds: number;
  rentPrice: number;
  propertyRating: string;
  amenities: string[];
  genderAllowed: "boys" | "girls" | "coed";
  foodAvailable: boolean;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    propertyId:     { type: String, unique: true },
    propertyName:   { type: String, required: true, trim: true },
    zoneId:         { type: Schema.Types.ObjectId, ref: "Zone", required: true },
    address:        { type: String, default: "" },
    location:       { type: String, default: "" },
    latitude:       { type: Number, default: null },
    longitude:      { type: Number, default: null },
    totalBeds:      { type: Number, default: 0 },
    availableBeds:  { type: Number, default: 0 },
    rentPrice:      { type: Number, default: 0 },
    propertyRating: { type: String, default: "B" },
    amenities:      [{ type: String }],
    genderAllowed:  { type: String, enum: ["boys","girls","coed"], default: "coed" },
    foodAvailable:  { type: Boolean, default: false },
    status:         { type: String, enum: ["active","inactive"], default: "active" },
  },
  { timestamps: true }
);

PropertySchema.pre("save", async function (next) {
  if (this.isNew && !this.propertyId) {
    const count = await mongoose.model("Property").countDocuments();
    this.propertyId = `P${String(count+1).padStart(3,"0")}`;
  }
  next();
});

export const Property: Model<IProperty> =
  mongoose.models.Property || mongoose.model<IProperty>("Property", PropertySchema);