import mongoose, { Schema, Document, Model } from "mongoose";

export type BookingStatus = "confirmed" | "cancelled" | "pending";
export type PaymentMode = "upi" | "cash" | "card" | "bank_transfer";

export interface IBooking extends Document {
  bookingId: string;
  leadId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  bedType: string;
  rentPrice: number;
  tokenPaid: number;
  paymentMode: PaymentMode;
  bookingStatus: BookingStatus;
  bookedBy: mongoose.Types.ObjectId;
  checkInDate: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingId:     { type: String, unique: true },
    leadId:        { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    propertyId:    { type: Schema.Types.ObjectId, ref: "Property", required: true },
    bedType:       { type: String, default: "" },
    rentPrice:     { type: Number, default: 0 },
    tokenPaid:     { type: Number, default: 0 },
    paymentMode:   { type: String, enum: ["upi","cash","card","bank_transfer"], default: "upi" },
    bookingStatus: { type: String, enum: ["confirmed","cancelled","pending"], default: "pending" },
    bookedBy:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    checkInDate:   { type: Date, default: null },
    notes:         { type: String, default: "" },
  },
  { timestamps: true }
);

BookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.bookingId) {
    const count = await mongoose.model("Booking").countDocuments();
    this.bookingId = `B${4001 + count}`;
  }
  next();
});

export const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
