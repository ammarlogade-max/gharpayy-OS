import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole =
  | "super_admin"
  | "zone_admin"
  | "alpha"
  | "beta"
  | "gamma"
  | "fire"
  | "water";

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  employeeName: string;
  role: UserRole;
  zoneId: mongoose.Types.ObjectId | null;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    employeeName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["super_admin", "zone_admin", "alpha", "beta", "gamma", "fire", "water"],
      default: "alpha",
    },
    zoneId: { type: Schema.Types.ObjectId, ref: "Zone", default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

// Never return passwordHash in JSON responses
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.passwordHash;
    return obj;
  },
});

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
