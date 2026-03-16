import mongoose, { Schema, Document, Model } from "mongoose";

export type DayStatus = "early" | "on_time" | "late" | "absent";
export type CurrentStatus = "checked_in" | "on_break" | "checked_out" | "absent";
export type BreakType = "short" | "lunch" | "personal";

export interface IBreakLog {
  breakType: BreakType;
  breakStart: Date;
  breakEnd: Date | null;
  durationMinutes: number;
}

export interface ISession {
  checkInTime: Date;
  checkOutTime: Date | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkInDistanceMeters: number | null;
  isGeoValid: boolean;
  workMinutes: number;
}

export interface IAttendance extends Document {
  attendanceId: string;
  employeeId: mongoose.Types.ObjectId;
  date: string;                        // "2026-03-16"
  sessions: ISession[];                // multiple clock-in/out per day
  breaks: IBreakLog[];                 // all breaks across the day
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  currentStatus: CurrentStatus;
  dayStatus: DayStatus;
  notes: string;
  markedByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BreakLogSchema = new Schema<IBreakLog>({ breakType: { type: String, enum: ["short","lunch","personal"], default: "short" }, breakStart: { type: Date, required: true }, breakEnd: { type: Date, default: null }, durationMinutes: { type: Number, default: 0 } }, { _id: false });

const SessionSchema = new Schema<ISession>({ checkInTime: { type: Date, required: true }, checkOutTime: { type: Date, default: null }, checkInLat: { type: Number, default: null }, checkInLng: { type: Number, default: null }, checkOutLat: { type: Number, default: null }, checkOutLng: { type: Number, default: null }, checkInDistanceMeters: { type: Number, default: null }, isGeoValid: { type: Boolean, default: false }, workMinutes: { type: Number, default: 0 } }, { _id: false });

const AttendanceSchema = new Schema<IAttendance>(
  {
    attendanceId:     { type: String, unique: true },
    employeeId:       { type: Schema.Types.ObjectId, ref: "User", required: true },
    date:             { type: String, required: true },
    sessions:         { type: [SessionSchema], default: [] },
    breaks:           { type: [BreakLogSchema], default: [] },
    firstCheckIn:     { type: Date, default: null },
    lastCheckOut:     { type: Date, default: null },
    totalWorkMinutes: { type: Number, default: 0 },
    totalBreakMinutes:{ type: Number, default: 0 },
    currentStatus:    { type: String, enum: ["checked_in","on_break","checked_out","absent"], default: "absent" },
    dayStatus:        { type: String, enum: ["early","on_time","late","absent"], default: "absent" },
    notes:            { type: String, default: "" },
    markedByAdmin:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, currentStatus: 1 });

AttendanceSchema.pre("save", async function (next) {
  if (this.isNew && !this.attendanceId) {
    const count = await mongoose.model("Attendance").countDocuments();
    this.attendanceId = `ATT-${this.date.replace(/-/g,"")}-${String(count+1).padStart(3,"0")}`;
  }
  next();
});

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
