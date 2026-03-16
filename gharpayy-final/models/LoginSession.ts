import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILoginSession extends Document {
  userId: mongoose.Types.ObjectId;
  loginTime: Date;
  logoutTime: Date | null;
  activeHours: number;
  createdAt: Date;
}

const LoginSessionSchema = new Schema<ILoginSession>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    loginTime:   { type: Date, default: Date.now },
    logoutTime:  { type: Date, default: null },
    activeHours: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const LoginSession: Model<ILoginSession> =
  mongoose.models.LoginSession ||
  mongoose.model<ILoginSession>("LoginSession", LoginSessionSchema);
